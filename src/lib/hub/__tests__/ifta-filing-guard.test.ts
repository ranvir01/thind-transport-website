/**
 * Regression: setIftaStatus allowed marking a quarter 'filed' while the
 * computed report still had missingRates — those jurisdictions' lines are
 * zeroed by computeIfta, so the filing would be materially understated.
 * It also silently no-oped (while still writing an audit row) when no report
 * existed for the quarter at all. Both must now throw.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({ query: vi.fn(), queryOne: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { query, queryOne } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { setIftaStatus } from "@/lib/hub/ifta"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const auditMock = vi.mocked(logAudit)
const actor = { id: "u1", name: "Dispatcher" }

function mockReport(row: { report: { missingRates?: string[] } | null } | null) {
  queryOneMock.mockResolvedValue(row)
}

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
  auditMock.mockReset()
  queryMock.mockResolvedValue([])
})

describe("setIftaStatus filing guard", () => {
  it("throws when marking filed with missing rates", async () => {
    mockReport({ report: { missingRates: ["OR", "NV"] } })
    await expect(setIftaStatus("carrier-1", "2026Q1", "filed", actor)).rejects.toThrow(
      /missing tax rates for OR, NV/
    )
    // Nothing written, nothing audited, when the guard trips.
    expect(queryMock).not.toHaveBeenCalled()
    expect(auditMock).not.toHaveBeenCalled()
  })

  it("throws when no report exists for the quarter", async () => {
    mockReport(null)
    await expect(setIftaStatus("carrier-1", "2026Q1", "filed", actor)).rejects.toThrow(
      /No report computed for 2026Q1/
    )
    expect(queryMock).not.toHaveBeenCalled()
    expect(auditMock).not.toHaveBeenCalled()
  })

  it("allows filed when all rates are on file", async () => {
    mockReport({ report: { missingRates: [] } })
    await expect(
      setIftaStatus("carrier-1", "2026Q1", "filed", actor)
    ).resolves.toBeUndefined()
    const update = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("UPDATE hub.ifta_reports")
    )
    expect(update).toBeDefined()
    expect(auditMock).toHaveBeenCalledOnce()
  })

  it("allows filed on a legacy report JSON with no missingRates key", async () => {
    mockReport({ report: null })
    await expect(
      setIftaStatus("carrier-1", "2026Q1", "filed", actor)
    ).resolves.toBeUndefined()
  })

  it("still allows reviewed and draft while rates are missing", async () => {
    mockReport({ report: { missingRates: ["ID"] } })
    await expect(
      setIftaStatus("carrier-1", "2026Q1", "reviewed", actor)
    ).resolves.toBeUndefined()
    await expect(
      setIftaStatus("carrier-1", "2026Q1", "draft", actor)
    ).resolves.toBeUndefined()
  })
})
