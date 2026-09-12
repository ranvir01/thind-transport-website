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
  submitDvir: vi.fn(async () => ({ id: "dvir-1", grounded: false, replayed: false })),
  certifyRepair: vi.fn(),
}))
vi.mock("@/lib/hub/notify", () => ({ notifyRoles: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { submitDvirAction } from "@/app/hub/_actions/dvir"
import { driverOwnsTruck, submitDvir } from "@/lib/hub/dvir"
import { logAudit } from "@/lib/hub/audit"
import { notifyRoles } from "@/lib/hub/notify"

const driverOwnsTruckMock = vi.mocked(driverOwnsTruck)
const submitDvirMock = vi.mocked(submitDvir)
const logAuditMock = vi.mocked(logAudit)
const notifyRolesMock = vi.mocked(notifyRoles)

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
  notifyRolesMock.mockClear()
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

  it("forwards the tap's clientRequestId to submitDvir, null when the app sent none", async () => {
    driverOwnsTruckMock.mockResolvedValue({ id: TRUCK, unit_number: "T-42" })

    await submitDvirAction({ ...baseInput, clientRequestId: "req-1" })
    expect(submitDvirMock.mock.calls[0][1]).toMatchObject({ clientRequestId: "req-1" })

    await submitDvirAction(baseInput)
    expect(submitDvirMock.mock.calls[1][1]).toMatchObject({ clientRequestId: null })
  })

  it("a replayed unsafe DVIR files no audit row and pages nobody a second time", async () => {
    driverOwnsTruckMock.mockResolvedValueOnce({ id: TRUCK, unit_number: "T-42" })
    submitDvirMock.mockResolvedValueOnce({ id: "dvir-first", grounded: true, replayed: true })

    const result = await submitDvirAction({
      ...baseInput, defects: [{ label: "Service brakes" }], safeToOperate: false, clientRequestId: "req-1",
    })

    // The tap still succeeds — the driver's queue drops it as sent.
    expect(result).toEqual({ ok: true, grounded: true })
    expect(logAuditMock).not.toHaveBeenCalled()
    expect(notifyRolesMock).not.toHaveBeenCalled()
  })

  it("a first-time unsafe DVIR still audits and pages the office (unchanged)", async () => {
    driverOwnsTruckMock.mockResolvedValueOnce({ id: TRUCK, unit_number: "T-42" })
    submitDvirMock.mockResolvedValueOnce({ id: "dvir-1", grounded: true, replayed: false })

    await submitDvirAction({ ...baseInput, defects: [{ label: "Service brakes" }], safeToOperate: false })

    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
    expect(notifyRolesMock.mock.calls[0][2]).toMatchObject({ title: expect.stringMatching(/grounded/) })
  })
})
