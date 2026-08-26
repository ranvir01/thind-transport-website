/**
 * assignTollTruckAction must report failure (and skip the audit log) when
 * assignTollToTruck touches 0 rows — a foreign or nonexistent transaction/
 * truck id — instead of a false-success audit entry (fuel-reclassify pattern).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/tolls", () => ({
  assignTollToTruck: vi.fn(),
}))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Dispatcher", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { assignTollToTruck } from "@/lib/hub/tolls"
import { logAudit } from "@/lib/hub/audit"
import { assignTollTruckAction } from "@/app/hub/_actions/tolls"

const assignMock = vi.mocked(assignTollToTruck)
const logAuditMock = vi.mocked(logAudit)

beforeEach(() => {
  assignMock.mockReset()
  logAuditMock.mockClear()
})

describe("assignTollTruckAction", () => {
  it("reports failure and skips the audit log when 0 rows changed", async () => {
    assignMock.mockResolvedValue(0)
    const result = await assignTollTruckAction("foreign-toll", "truck-1")
    expect(result).toEqual({ ok: false, error: "Could not match that toll to the truck" })
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("logs the audit entry when the update actually matched a row", async () => {
    assignMock.mockResolvedValue(1)
    const result = await assignTollTruckAction("toll-1", "truck-1")
    expect(result).toEqual({ ok: true })
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "assign_toll_truck", entityId: "toll-1" })
    )
  })

  it("logs an unassign action when clearing the truck", async () => {
    assignMock.mockResolvedValue(1)
    const result = await assignTollTruckAction("toll-1", null)
    expect(result).toEqual({ ok: true })
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "unassign_toll_truck" })
    )
  })
})
