/**
 * driverVerifyPickup — the action behind the "Snap the truck" button.
 * Pinned: ownership (a driver cannot verify someone else's load), the stop
 * must be a pickup the driver already arrived at, a mismatch pages the office
 * and never returns an error to the driver, and no GPS is "unverified", not a
 * failure. The pure rules themselves live in pickup-verification.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  requireDriverUser, driverOwnsLoad, queryOne, query, saveDocument, recordPickupVerification, notifyRoles, addLoadEvent,
} = vi.hoisted(() => ({
  requireDriverUser: vi.fn(async () => ({ id: "u1", name: "Harpreet Singh", email: "d@x", role: "driver", carrierId: "carrier-1", driverId: "driver-1" })),
  driverOwnsLoad: vi.fn(async () => ({ id: "load-1", status: "at_pickup" })),
  queryOne: vi.fn(async (_sql: string, _params?: unknown[]): Promise<unknown> => null),
  query: vi.fn(async (_sql: string, _params?: unknown[]): Promise<unknown[]> => []),
  saveDocument: vi.fn(async () => ({ id: "doc-1" })),
  recordPickupVerification: vi.fn(async () => ({ id: "v-1" })),
  notifyRoles: vi.fn(async () => undefined),
  addLoadEvent: vi.fn(async () => undefined),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({ requireDriverUser }))
vi.mock("@/lib/hub/driver-app", () => ({ driverOwnsLoad, DRIVER_STATUS_FLOW: {} }))
vi.mock("@/lib/hub/loads", () => ({
  addLoadEvent, changeLoadStatus: vi.fn(), setStopTimestamp: vi.fn(), getLoad: vi.fn(),
}))
vi.mock("@/lib/hub/db", () => ({ query, queryOne }))
vi.mock("@/lib/hub/documents", () => ({ saveDocument }))
vi.mock("@/lib/hub/pickup-verifications", () => ({ recordPickupVerification }))
vi.mock("@/lib/hub/notify", () => ({ notifyRoles }))
vi.mock("@/lib/hub/detention", () => ({ applyDetentionAccrual: vi.fn() }))
vi.mock("@/lib/hub/facilities", () => ({ addFacilityNote: vi.fn() }))
vi.mock("@/lib/hub/timeoff", () => ({ createTimeOffRequest: vi.fn(), cancelTimeOff: vi.fn() }))
vi.mock("@/lib/hub/announcements", () => ({ acknowledgeAnnouncement: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn() }))
vi.mock("@/lib/hub/settlements", () => ({ insertAdvanceWithinExposureCap: vi.fn() }))

import { driverVerifyPickup } from "@/app/hub/_actions/driver"

const DOCK = { lat: 47.3809, lng: -122.2348 }
const STOP = { id: "stop-1", type: "pickup", ...DOCK, appt_start: null, appt_end: null, fcfs: true, arrived_at: "2026-06-12T15:00:00Z" }
const DISPATCH = { driver_id: "driver-1", truck_id: "truck-1", reference: "THD-1003" }

function routeQueryOne(stop: unknown = STOP, dispatch: unknown = DISPATCH) {
  queryOne.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("FROM hub.stops")) return stop
    if (s.includes("FROM hub.loads")) return dispatch
    return null
  })
}

function form(over: Record<string, string | File> = {}) {
  const fd = new FormData()
  fd.set("load_id", "load-1")
  fd.set("stop_id", "stop-1")
  fd.set("lat", String(DOCK.lat + 0.0005))
  fd.set("lng", String(DOCK.lng))
  fd.set("file", new File([new Uint8Array([137, 80, 78, 71])], "dock.png", { type: "image/png" }))
  for (const [k, v] of Object.entries(over)) fd.set(k, v)
  return fd
}

describe("driverVerifyPickup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    driverOwnsLoad.mockResolvedValue({ id: "load-1", status: "at_pickup" } as never)
    routeQueryOne()
  })

  it("refuses a load that is not this driver's, before any write", async () => {
    driverOwnsLoad.mockResolvedValue(null as never)
    const r = await driverVerifyPickup(form())
    expect(r).toEqual({ ok: false, error: "That load isn't yours" })
    expect(saveDocument).not.toHaveBeenCalled()
    expect(recordPickupVerification).not.toHaveBeenCalled()
  })

  it("only verifies a pickup stop the driver has already arrived at", async () => {
    routeQueryOne({ ...STOP, type: "delivery" })
    expect((await driverVerifyPickup(form())).ok).toBe(false)
    routeQueryOne({ ...STOP, arrived_at: null })
    expect(await driverVerifyPickup(form())).toEqual({ ok: false, error: "Tap I'm here first" })
    expect(recordPickupVerification).not.toHaveBeenCalled()
  })

  it("scopes the stop lookup to the carrier AND the load", async () => {
    await driverVerifyPickup(form())
    const stopCall = queryOne.mock.calls.find(([sql]) => String(sql).includes("FROM hub.stops"))!
    expect(String(stopCall[0]).replace(/\s+/g, " ")).toContain("WHERE carrier_id = $1 AND id = $2 AND load_id = $3")
    expect(stopCall[1]).toEqual(["carrier-1", "stop-1", "load-1"])
  })

  it("verifies at the dock: saves the photo as pickup_photo, records the row, logs a check call", async () => {
    const r = await driverVerifyPickup(form())
    expect(r).toEqual({ ok: true, result: "verified" })
    expect(saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: "carrier-1", entityType: "load", entityId: "load-1", kind: "pickup_photo", uploadedBy: "u1" })
    )
    expect(recordPickupVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierId: "carrier-1", loadId: "load-1", stopId: "stop-1", driverId: "driver-1", truckId: "truck-1",
        photoDocumentId: "doc-1", result: "verified",
      })
    )
    expect(addLoadEvent).toHaveBeenCalledWith(
      "carrier-1", "load-1", "check_call",
      expect.objectContaining({ type: "pickup_verification", result: "verified" }),
      { id: "u1", name: "Harpreet Singh" }
    )
    expect(notifyRoles).not.toHaveBeenCalled()
  })

  it("pages dispatch and the owner on a mismatch, and still succeeds for the driver", async () => {
    // Tacoma — ~10 mi from the dock.
    const r = await driverVerifyPickup(form({ lat: "47.2529", lng: "-122.4443" }))
    expect(r).toEqual({ ok: true, result: "mismatch" })
    expect(notifyRoles).toHaveBeenCalledWith(
      "carrier-1", ["dispatcher", "owner"],
      expect.objectContaining({ kind: "pickup_mismatch", title: expect.stringContaining("THD-1003"), link: "/hub/loads/load-1" })
    )
    expect(recordPickupVerification).toHaveBeenCalledWith(expect.objectContaining({ result: "mismatch" }))
  })

  it("treats no GPS as unverified — recorded, no page, no error", async () => {
    const fd = form()
    fd.delete("lat")
    fd.delete("lng")
    const r = await driverVerifyPickup(fd)
    expect(r).toEqual({ ok: true, result: "unverified" })
    expect(recordPickupVerification).toHaveBeenCalledWith(expect.objectContaining({ fix: null, distanceMiles: null, result: "unverified" }))
    expect(notifyRoles).not.toHaveBeenCalled()
  })

  it("does not fail without a photo — it records unverified so the arrival evidence is not lost", async () => {
    const fd = form()
    fd.delete("file")
    const r = await driverVerifyPickup(fd)
    expect(r.ok).toBe(true)
    expect(saveDocument).not.toHaveBeenCalled()
    expect(recordPickupVerification).toHaveBeenCalledWith(expect.objectContaining({ photoDocumentId: null, result: "unverified" }))
  })
})
