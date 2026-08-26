import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Dispatcher", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/facilities", () => ({
  addFacilityNote: vi.fn(),
  detentionRisk: vi.fn(),
  formatDwell: vi.fn(),
  updateFacilityInfo: vi.fn(async () => 1),
}))
vi.mock("@/lib/hub/settings", () => ({ getCarrierSettings: vi.fn() }))
vi.mock("@/lib/hub/db", () => ({ queryOne: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { facilityLookupAction, updateFacilityAction } from "@/app/hub/_actions/facilities"
import { updateFacilityInfo } from "@/lib/hub/facilities"
import { logAudit } from "@/lib/hub/audit"
import { queryOne } from "@/lib/hub/db"

const updateMock = vi.mocked(updateFacilityInfo)
const logAuditMock = vi.mocked(logAudit)
const queryOneMock = vi.mocked(queryOne)

describe("updateFacilityAction — typical lumper money parsing", () => {
  beforeEach(() => {
    updateMock.mockReset()
    updateMock.mockResolvedValue(1)
    logAuditMock.mockClear()
  })

  it("stores a genuinely free ($0.00) lumper fee as 0 cents, not null", async () => {
    await updateFacilityAction("facility-1", { typicalLumper: "0.00" })
    expect(updateMock).toHaveBeenCalledWith(
      "carrier-1",
      "facility-1",
      expect.objectContaining({ typicalLumperCents: 0 })
    )
  })

  it("parses a normal dollar amount to integer cents via the canonical parser", async () => {
    await updateFacilityAction("facility-1", { typicalLumper: "125.50" })
    expect(updateMock).toHaveBeenCalledWith(
      "carrier-1",
      "facility-1",
      expect.objectContaining({ typicalLumperCents: 12550 })
    )
  })

  it("clears the field to null when left blank", async () => {
    await updateFacilityAction("facility-1", { typicalLumper: "" })
    expect(updateMock).toHaveBeenCalledWith(
      "carrier-1",
      "facility-1",
      expect.objectContaining({ typicalLumperCents: null })
    )
  })

  it("audits the lumper cents write (money-adjacent)", async () => {
    const result = await updateFacilityAction("facility-1", { typicalLumper: "125.50" })
    expect(result).toEqual({ ok: true })
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierId: "carrier-1",
        actorId: "u1",
        entityType: "facility",
        entityId: "facility-1",
        action: "update",
        newValue: { typicalLumperCents: 12550 },
      })
    )
  })

  it("reports failure and skips the audit log when 0 rows changed", async () => {
    updateMock.mockResolvedValueOnce(0)
    const result = await updateFacilityAction("foreign-facility", { hours: "0600-1400" })
    expect(result).toEqual({ ok: false, error: "Facility not found" })
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})

describe("facilityLookupAction — dwell/note subqueries", () => {
  beforeEach(() => {
    queryOneMock.mockReset()
    queryOneMock.mockResolvedValue(null)
  })

  it("correlates avg_dwell and note_count on the facility carrier, not facility_id alone", async () => {
    const result = await facilityLookupAction({ name: "Costco DC", city: "Tracy", state: "CA" })
    expect(result).toEqual({ found: false })
    expect(queryOneMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("s.facility_id = f.id AND s.carrier_id = f.carrier_id")
    expect(String(sql)).toContain("n.facility_id = f.id AND n.carrier_id = f.carrier_id")
    expect(params).toEqual(["carrier-1", "Costco DC", "Tracy", "CA"])
  })
})
