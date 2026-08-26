/**
 * Regression: saveCostPerMileAction used a bare UPDATE on hub.carrier_settings.
 * A missing settings row matched 0 rows, still logAudited success, and returned
 * ok while getCarrierSettings kept serving DEFAULT_SETTINGS.costPerMileCents
 * (234¢) — every dispatch-board margin and lane rank silently unchanged.
 * Upsert like updateOfficeEmailAction / setBrandAccentAction; skip the audit
 * when RETURNING is empty.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(),
}))

vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

vi.mock("@/lib/hub/settings", () => ({
  getCarrierSettings: vi.fn(async () => ({ costPerMileCents: 234 })),
}))

import { requirePermission } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { getCarrierSettings } from "@/lib/hub/settings"
import { saveCostPerMileAction } from "@/app/hub/_actions/operating-cost"

const requirePermissionMock = vi.mocked(requirePermission)
const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)
const settingsMock = vi.mocked(getCarrierSettings)

const CARRIER_ID = "55555555-5555-5555-5555-555555555555"
const OWNER = {
  id: "u1",
  name: "Priya",
  email: "p@a.com",
  role: "owner" as const,
  carrierId: CARRIER_ID,
}

beforeEach(() => {
  requirePermissionMock.mockReset()
  queryMock.mockReset()
  queryMock.mockResolvedValue([{ carrier_id: CARRIER_ID }])
  logAuditMock.mockReset()
  settingsMock.mockReset()
  settingsMock.mockResolvedValue({ costPerMileCents: 234 } as never)
})

describe("saveCostPerMileAction", () => {
  it("rejects without settings:manage before any write", async () => {
    requirePermissionMock.mockRejectedValue(new Error("Forbidden"))
    const result = await saveCostPerMileAction({ cents: 178 })
    expect(result.ok).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
    expect(requirePermissionMock).toHaveBeenCalledWith("settings:manage")
  })

  it("rejects a non-integer before any write", async () => {
    requirePermissionMock.mockResolvedValue(OWNER)
    const result = await saveCostPerMileAction({ cents: 178.5 })
    expect(result).toEqual({ ok: false, error: "Enter a whole number of cents per mile" })
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("rejects a typo-range value before any write", async () => {
    requirePermissionMock.mockResolvedValue(OWNER)
    const result = await saveCostPerMileAction({ cents: 12 })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/typo/)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("upserts integer cents scoped to the caller's carrier and audits the change", async () => {
    requirePermissionMock.mockResolvedValue(OWNER)
    const result = await saveCostPerMileAction({ cents: 178 })
    expect(result).toEqual({ ok: true })
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("ON CONFLICT (carrier_id) DO UPDATE")
    expect(String(sql)).toContain("'{costPerMileCents}'")
    expect(String(sql)).toContain("RETURNING carrier_id")
    expect(params).toEqual([CARRIER_ID, 178])
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock.mock.calls[0][0]).toMatchObject({
      carrierId: CARRIER_ID,
      actorId: OWNER.id,
      entityType: "carrier_settings",
      entityId: CARRIER_ID,
      action: "cost_per_mile_changed",
      oldValue: { costPerMileCents: 234 },
      newValue: { costPerMileCents: 178 },
    })
  })

  it("returns an error and skips the audit when the upsert matches no row", async () => {
    requirePermissionMock.mockResolvedValue(OWNER)
    queryMock.mockResolvedValueOnce([])
    const result = await saveCostPerMileAction({ cents: 178 })
    expect(result).toEqual({ ok: false, error: "Could not save the cost per mile" })
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})
