/**
 * Regression: importFuelAction and importTollsAction inserted money-bearing
 * rows (fuel_transactions.total_cents, toll_transactions.amount_cents) with
 * no logAudit call, unlike the sibling importLoadsAction. (1c money audit.)
 *
 * importPositionsAction had the same gap for ELD GPS pings — it rewrites
 * hub.position_pings (the office map) without a trail. One action per cycle.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Dispatcher", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/loads", () => ({ createLoad: vi.fn() }))
vi.mock("@/lib/hub/customers", () => ({ findCustomerByName: vi.fn(), createCustomer: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))

import { requirePermission } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"
import { query } from "@/lib/hub/db"
import {
  importFuelAction,
  importPositionsAction,
  importTollsAction,
} from "@/app/hub/_actions/import"

const logAuditMock = vi.mocked(logAudit)
const requirePermissionMock = vi.mocked(requirePermission)
const queryMock = vi.mocked(query)

beforeEach(() => {
  logAuditMock.mockClear()
  requirePermissionMock.mockReset()
  requirePermissionMock.mockResolvedValue({
    id: "u1",
    name: "Dispatcher",
    email: "dana@example.com",
    role: "dispatcher",
    carrierId: "carrier-1",
  })
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
})

describe("importFuelAction", () => {
  it("logs an audit entry summarizing the import batch", async () => {
    const result = await importFuelAction([], "efs")
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "import_fuel", entityType: "import" })
    )
  })
})

describe("importTollsAction", () => {
  it("logs an audit entry summarizing the import batch", async () => {
    const result = await importTollsAction([], "pcmiler")
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "import_tolls", entityType: "import" })
    )
  })
})

describe("importPositionsAction", () => {
  it("requires imports:run and audits an empty batch the way fuel/tolls do", async () => {
    const result = await importPositionsAction([])
    expect(result).toEqual({ ok: true, imported: 0, failed: [] })
    expect(requirePermissionMock).toHaveBeenCalledWith("imports:run")
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith({
      carrierId: "carrier-1",
      actorId: "u1",
      actorName: "Dispatcher",
      entityType: "import",
      entityId: expect.any(String),
      action: "import_positions",
      newValue: { imported: 0, failed: 0 },
    })
  })

  it("skips the audit log when permission is denied", async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden: viewer cannot imports:run"))
    const result = await importPositionsAction([
      { truck_unit: "101", ts: "2026-09-01T12:00:00Z", lat: "47.4", lng: "-122.2" },
    ])
    expect(result.ok).toBe(false)
    expect(result.imported).toBe(0)
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("audits a successful carrier-scoped insert and keeps truck lookup tenancy", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("FROM hub.trucks")) {
        return [{ id: "truck-1", unit_number: "101" }]
      }
      return []
    })
    const result = await importPositionsAction([
      { truck_unit: "101", ts: "2026-09-01T12:00:00Z", lat: "47.4", lng: "-122.2", odometer: "412000" },
    ])
    expect(result).toEqual({ ok: true, imported: 1, failed: [] })
    const truckSelect = queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.trucks"))
    expect(truckSelect?.[1]).toEqual(["carrier-1"])
    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.position_pings"))
    expect(insert).toBeTruthy()
    expect((insert?.[1] as unknown[]).slice(0, 2)).toEqual(["carrier-1", "truck-1"])
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "import_positions",
        entityType: "import",
        newValue: { imported: 1, failed: 0 },
      })
    )
  })

  it("still audits when every row fails (unknown truck) so the attempt is visible", async () => {
    const result = await importPositionsAction([
      { truck_unit: "999", ts: "2026-09-01T12:00:00Z", lat: "47.4", lng: "-122.2" },
    ])
    expect(result.ok).toBe(false)
    expect(result.imported).toBe(0)
    expect(result.failed).toHaveLength(1)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "import_positions",
        newValue: { imported: 0, failed: 1 },
      })
    )
  })
})
