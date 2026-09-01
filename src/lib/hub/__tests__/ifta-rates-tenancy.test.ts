/**
 * Regression: hub.ifta_tax_rates was the one shared-write table — any
 * tenant's compliance:write user could overwrite the rates every carrier's
 * IFTA computation read (silent cross-tenant tax corruption). Migration 016
 * added carrier_id; every rate read/write must scope by it, and the import
 * (a money-adjacent mutation) must be audited.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { importIftaRates, listIftaRates } from "@/lib/hub/ifta"

const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)
const actor = { id: "u1", name: "Dispatcher" }

beforeEach(() => {
  queryMock.mockClear()
  logAuditMock.mockClear()
})

describe("importIftaRates", () => {
  it("writes rates under the caller's carrier and conflicts per-carrier", async () => {
    await importIftaRates("carrier-1", [{ jurisdiction: "wa", rate: 0.494, surchargeRate: 0 }], "2026Q1", actor)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("carrier_id")
    expect(sql).toContain("ON CONFLICT (carrier_id, jurisdiction, quarter)")
    expect(params).toEqual(["carrier-1", "WA", "2026Q1", 0.494, 0])
  })

  it("audits the import with the jurisdictions written", async () => {
    await importIftaRates("carrier-1", [{ jurisdiction: "wa", rate: 0.494, surchargeRate: 0 }], "2026Q1", actor)
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierId: "carrier-1",
        entityType: "ifta_rates",
        entityId: "2026Q1",
        action: "import",
      })
    )
  })
})

describe("listIftaRates", () => {
  it("only reads the caller's carrier rows", async () => {
    await listIftaRates("carrier-1", "2026Q1")
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("carrier_id = $1")
    expect(params).toEqual(["carrier-1", "2026Q1"])
  })
})
