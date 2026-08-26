/**
 * Regression: dispatching a load used to be silent for the driver — nothing
 * pushed to their phone until they happened to open the driver app. This
 * covers the new changeLoadStatus -> notifyDriver hookup fired once, only on
 * the booked/whatever -> dispatched transition, and never breaking the
 * status change itself if the push fails.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { notifyDriver } = vi.hoisted(() => ({
  notifyDriver: vi.fn(async () => undefined),
}))

function makeClient(currentStatus: string | null, driverId: string | null) {
  const query = vi.fn(async (text: string) => {
    if (text.includes("BEGIN") || text.includes("COMMIT") || text.includes("ROLLBACK")) {
      return { rows: [] }
    }
    if (text.includes("FOR UPDATE")) {
      return { rows: currentStatus ? [{ status: currentStatus }] : [] }
    }
    if (text.includes("UPDATE hub.loads SET status")) {
      return {
        rows: [
          { id: "load-1", carrier_id: "carrier-1", reference: "THD-1042", status: "dispatched", driver_id: driverId },
        ],
      }
    }
    if (text.includes("INSERT INTO hub.load_events")) {
      return { rows: [] }
    }
    throw new Error(`unexpected query: ${text}`)
  })
  return { query, release: vi.fn() }
}

const CARRIER = "carrier-1"
const LOAD = "load-1"
const ACTOR = { id: "u1", name: "Dispatcher" }

describe("changeLoadStatus driver notification", () => {
  let client: ReturnType<typeof makeClient>

  beforeEach(() => {
    notifyDriver.mockClear()
    vi.resetModules()
  })

  async function loadModule() {
    vi.doMock("../db", () => ({
      hubDb: vi.fn(() => ({ connect: vi.fn(async () => client) })),
      query: vi.fn(async () => []),
      queryOne: vi.fn(async () => null),
    }))
    vi.doMock("../notify", () => ({ notifyDriver }))
    vi.doMock("../facilities", () => ({ facilityDedupeKey: vi.fn(() => "key") }))
    vi.doMock("../tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))
    const mod = await import("../loads")
    return mod.changeLoadStatus
  }

  it("notifies the assigned driver when a load moves booked -> dispatched", async () => {
    client = makeClient("booked", "driver-9")
    const changeLoadStatus = await loadModule()

    const load = await changeLoadStatus(CARRIER, LOAD, "dispatched", ACTOR)

    expect(load?.status).toBe("dispatched")
    expect(notifyDriver).toHaveBeenCalledTimes(1)
    expect(notifyDriver).toHaveBeenCalledWith(CARRIER, "driver-9", expect.objectContaining({
      kind: "load_dispatched",
      title: expect.stringContaining("THD-1042"),
      link: "/hub/driver",
    }))
  })

  it("does not notify when the load has no driver assigned", async () => {
    client = makeClient("booked", null)
    const changeLoadStatus = await loadModule()

    await changeLoadStatus(CARRIER, LOAD, "dispatched", ACTOR)

    expect(notifyDriver).not.toHaveBeenCalled()
  })

  it("does not re-notify when the load is already dispatched", async () => {
    client = makeClient("dispatched", "driver-9")
    const changeLoadStatus = await loadModule()

    await changeLoadStatus(CARRIER, LOAD, "dispatched", ACTOR)

    expect(notifyDriver).not.toHaveBeenCalled()
  })

  it("still returns the updated load when the push notification throws", async () => {
    client = makeClient("booked", "driver-9")
    notifyDriver.mockRejectedValueOnce(new Error("VAPID down"))
    const changeLoadStatus = await loadModule()

    const load = await changeLoadStatus(CARRIER, LOAD, "dispatched", ACTOR)

    expect(load?.status).toBe("dispatched")
  })
})
