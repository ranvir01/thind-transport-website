/**
 * Regression: addMaintenanceRecordAction inserted a real dollar cost
 * (cost_cents) into hub.maintenance_records with no logAudit call, unlike
 * every other cost-bearing mutation in the codebase. (1c money audit.)
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
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => [{ id: "record-1" }]) }))

import { logAudit } from "@/lib/hub/audit"
import { addMaintenanceRecordAction } from "@/app/hub/_actions/compliance"

const logAuditMock = vi.mocked(logAudit)

beforeEach(() => logAuditMock.mockClear())

describe("addMaintenanceRecordAction", () => {
  it("logs an audit entry for the maintenance cost", async () => {
    const result = await addMaintenanceRecordAction({
      truckId: "truck-1", doneOn: "2026-07-01", cost: "450.00",
    })
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "maintenance_record", action: "create" })
    )
  })
})
