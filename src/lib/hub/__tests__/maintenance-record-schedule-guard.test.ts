/**
 * Regression (fleet subsystem audit): addMaintenanceRecordAction verified the
 * schedule belonged to the carrier but not to the truck, so a crafted call
 * could roll another truck's PM clock forward; and the schedule UPDATE passed
 * the raw (possibly empty) doneOn while the record INSERT fell back to today,
 * so a cleared date field made the update throw after the record was already
 * inserted.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Dispatcher", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/compliance", () => ({ addComplianceItem: vi.fn(), resolveComplianceItem: vi.fn() }))
vi.mock("@/lib/hub/ifta", () => ({ computeIftaQuarter: vi.fn(), importIftaRates: vi.fn(), setIftaStatus: vi.fn() }))
vi.mock("@/lib/hub/tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn() }))

import { query } from "@/lib/hub/db"
import { addMaintenanceRecordAction } from "@/app/hub/_actions/compliance"

const queryMock = vi.mocked(query)

function mockDb({ scheduleMatchesTruck }: { scheduleMatchesTruck: boolean }) {
  queryMock.mockImplementation(async (sql: string) => {
    if (/SELECT id FROM hub\.maintenance_schedules/.test(sql)) {
      return scheduleMatchesTruck ? [{ id: "sched-1" }] : []
    }
    if (/INSERT INTO hub\.maintenance_records/.test(sql)) return [{ id: "record-1" }]
    return []
  })
}

function callsMatching(pattern: RegExp) {
  return queryMock.mock.calls.filter(([sql]) => pattern.test(sql as string))
}

beforeEach(() => queryMock.mockReset())

describe("addMaintenanceRecordAction schedule guard", () => {
  it("rejects a schedule belonging to a different truck before inserting anything", async () => {
    mockDb({ scheduleMatchesTruck: false })
    const result = await addMaintenanceRecordAction({
      truckId: "truck-1", doneOn: "2026-07-01", cost: "450.00", scheduleId: "sched-other-truck",
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBe("Maintenance schedule not found")
    expect(callsMatching(/INSERT INTO hub\.maintenance_records/)).toHaveLength(0)
    const [guardSql, guardParams] = callsMatching(/SELECT id FROM hub\.maintenance_schedules/)[0]
    expect(guardSql).toContain("carrier_id = $2 AND truck_id = $3")
    expect(guardParams).toEqual(["sched-other-truck", "carrier-1", "truck-1"])
  })

  it("scopes the schedule roll-forward to the truck as well as the carrier", async () => {
    mockDb({ scheduleMatchesTruck: true })
    const result = await addMaintenanceRecordAction({
      truckId: "truck-1", doneOn: "2026-07-01", cost: "450.00", scheduleId: "sched-1",
    })
    expect(result.ok).toBe(true)
    const [updateSql, updateParams] = callsMatching(/UPDATE hub\.maintenance_schedules/)[0]
    expect(updateSql).toContain("AND truck_id = $5")
    expect(updateParams).toEqual(["sched-1", "2026-07-01", null, "carrier-1", "truck-1"])
  })

  it("uses the same fallback date for the record and the schedule when doneOn is empty", async () => {
    mockDb({ scheduleMatchesTruck: true })
    const result = await addMaintenanceRecordAction({
      truckId: "truck-1", doneOn: "", cost: "450.00", scheduleId: "sched-1",
    })
    expect(result.ok).toBe(true)
    const insertDoneOn = callsMatching(/INSERT INTO hub\.maintenance_records/)[0][1]?.[3]
    const updateDoneOn = callsMatching(/UPDATE hub\.maintenance_schedules/)[0][1]?.[1]
    expect(insertDoneOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(updateDoneOn).toBe(insertDoneOn)
  })
})
