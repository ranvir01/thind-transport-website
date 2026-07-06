/**
 * Regression: setFuelUse returned void, so reclassifyFuelUse always logged
 * "reclassify_fuel_use" and returned {ok:true} even when the UPDATE matched
 * 0 rows (a foreign or nonexistent transaction id) — a false-success audit
 * entry for a reclassification that never happened. (1c tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/fuel", () => ({
  setFuelUse: vi.fn(),
  assignFuelToLoad: vi.fn(async () => 1),
}))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Dispatcher", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { setFuelUse } from "@/lib/hub/fuel"
import { logAudit } from "@/lib/hub/audit"
import { reclassifyFuelUse } from "@/app/hub/_actions/fuel"

const setFuelUseMock = vi.mocked(setFuelUse)
const logAuditMock = vi.mocked(logAudit)

beforeEach(() => {
  setFuelUseMock.mockReset()
  logAuditMock.mockClear()
})

describe("reclassifyFuelUse", () => {
  it("reports failure and skips the audit log when the transaction isn't found (0 rows changed)", async () => {
    setFuelUseMock.mockResolvedValue(false)
    const result = await reclassifyFuelUse("foreign-txn", "reefer")
    expect(result).toEqual({ ok: false, error: "Receipt not found" })
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("logs the audit entry when the update actually matched a row", async () => {
    setFuelUseMock.mockResolvedValue(true)
    const result = await reclassifyFuelUse("txn-1", "reefer")
    expect(result).toEqual({ ok: true })
    expect(logAuditMock).toHaveBeenCalledTimes(1)
  })
})
