/**
 * Regression: computeIftaQuarter upserts status back to 'draft' on every run,
 * so recomputing a reviewed/filed quarter silently un-filed it (backlog item
 * from the compliance-wall auto-entry cycle). The guard must refuse to reset
 * a finalized quarter unless the caller explicitly confirms.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({ query: vi.fn(), queryOne: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { query } from "@/lib/hub/db"
import { computeIftaQuarter } from "@/lib/hub/ifta"

const queryMock = vi.mocked(query)
const actor = { id: "u1", name: "Dispatcher" }

function mockStatus(status: string | null) {
  queryMock.mockImplementation(async (...args: unknown[]) => {
    const sql = String(args[0] ?? "")
    if (sql.includes("SELECT status FROM hub.ifta_reports")) {
      return status ? [{ status }] : []
    }
    return []
  })
}

beforeEach(() => queryMock.mockReset())

describe("computeIftaQuarter recompute guard", () => {
  it("throws when the quarter is filed and recompute is not confirmed", async () => {
    mockStatus("filed")
    await expect(computeIftaQuarter("carrier-1", "2026Q1", actor)).rejects.toThrow(
      /already filed/
    )
    // Nothing must be written when the guard trips.
    const writes = queryMock.mock.calls.filter(([sql]) => /INSERT|UPDATE/i.test(String(sql)))
    expect(writes).toHaveLength(0)
  })

  it("throws when the quarter is reviewed and recompute is not confirmed", async () => {
    mockStatus("reviewed")
    await expect(computeIftaQuarter("carrier-1", "2026Q1", actor)).rejects.toThrow(
      /already reviewed/
    )
  })

  it("proceeds on a filed quarter when the recompute is confirmed", async () => {
    mockStatus("filed")
    const { result } = await computeIftaQuarter("carrier-1", "2026Q1", actor, {
      allowRecomputeOfFinalized: true,
    })
    expect(result.netTaxCents).toBe(0)
    const upsert = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO hub.ifta_reports")
    )
    expect(upsert).toBeDefined()
  })

  it("proceeds without confirmation on a draft quarter", async () => {
    mockStatus("draft")
    await expect(
      computeIftaQuarter("carrier-1", "2026Q1", actor)
    ).resolves.toBeDefined()
  })

  it("proceeds without confirmation when the quarter was never computed", async () => {
    mockStatus(null)
    await expect(
      computeIftaQuarter("carrier-1", "2026Q1", actor)
    ).resolves.toBeDefined()
  })
})
