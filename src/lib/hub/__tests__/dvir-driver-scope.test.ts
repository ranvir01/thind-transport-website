/**
 * Fleet subsystem audit (1c-style): submitDvirAction only checked that a
 * truck belonged to the driver's *carrier*, not that it belonged to the
 * *driver* — any driver in the carrier could file (and potentially ground,
 * via an unsafe post-trip) a truck they'd never touched. driverOwnsTruck
 * closes the gap; this pins the action's enforcement of it.
 * (SQL-shape of driverOwnsTruck itself is pinned in dvir-tenancy.test.ts.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requireDriverUser: vi.fn(async () => ({ id: "u1", name: "Sam Driver", carrierId: "carrier-1", driverId: "driver-1" })),
}))
vi.mock("@/lib/hub/dvir", () => ({
  driverOwnsTruck: vi.fn(),
  submitDvir: vi.fn(async () => ({ id: "dvir-1", grounded: false })),
  certifyRepair: vi.fn(),
}))
vi.mock("@/lib/hub/notify", () => ({ notifyRoles: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { submitDvirAction } from "@/app/hub/_actions/dvir"
import { driverOwnsTruck, submitDvir } from "@/lib/hub/dvir"
import { logAudit } from "@/lib/hub/audit"

const driverOwnsTruckMock = vi.mocked(driverOwnsTruck)
const submitDvirMock = vi.mocked(submitDvir)
const logAuditMock = vi.mocked(logAudit)

const CARRIER = "carrier-1"
const DRIVER = "driver-1"
const TRUCK = "truck-1"

const baseInput = {
  truckId: TRUCK,
  type: "post" as const,
  checklist: [],
  defects: [],
  safeToOperate: true,
  signature: "data:image/png;base64,x",
  priorDvirId: null,
}

beforeEach(() => {
  driverOwnsTruckMock.mockReset()
  submitDvirMock.mockClear()
  logAuditMock.mockClear()
})

describe("submitDvirAction", () => {
  it("rejects a DVIR for a truck the driver doesn't own, without touching submitDvir/logAudit", async () => {
    driverOwnsTruckMock.mockResolvedValueOnce(null)

    const result = await submitDvirAction(baseInput)

    expect(result).toEqual({ ok: false, error: "Truck not found" })
    expect(driverOwnsTruckMock).toHaveBeenCalledWith(CARRIER, DRIVER, TRUCK)
    expect(submitDvirMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("accepts a DVIR for the driver's own truck", async () => {
    driverOwnsTruckMock.mockResolvedValueOnce({ id: TRUCK, unit_number: "T-42" })

    const result = await submitDvirAction(baseInput)

    expect(result.ok).toBe(true)
    expect(submitDvirMock).toHaveBeenCalled()
  })
})
