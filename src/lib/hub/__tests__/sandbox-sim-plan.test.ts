/**
 * The Shift Mode rulebook, pinned: planSandboxTick is the pure brain of the
 * live sandbox, and these tests are the contract the executor relies on —
 * player ownership is sacred (clamp + notify, never auto-advance), catch-up
 * is bounded (a 14-hour gap becomes a digest, not a firehose), the
 * thermostat tops up without flooding, and AI teammates stand down the
 * moment a human's presence heartbeat covers their seat.
 */
import { describe, expect, it } from "vitest"
import { hash01 } from "../sandbox-sim-math"
import {
  planSandboxTick,
  SIM,
  statusPath,
  type SimLoad,
  type SimState,
  type WorldSnapshot,
} from "../sandbox-sim-plan"
import { AVG_MPH } from "../sandbox-world"

const MIN = 60_000
const HOUR = 3_600_000
// 10:00 PST — inside broker business hours, safely away from DST edges.
const NOW = new Date("2026-01-15T18:00:00Z")

function makeLoad(over: Partial<SimLoad> & { id: string }): SimLoad {
  return {
    reference: `BRH-${over.id}`,
    status: "quoted",
    loadedMiles: 520,
    driverId: null,
    truckId: null,
    playerDriven: false,
    createdAt: new Date(NOW.getTime() - 30 * MIN),
    deliveredAt: null,
    pickup: null,
    delivery: null,
    ...over,
  }
}

function stop(id: string, over: Partial<NonNullable<SimLoad["pickup"]>> = {}) {
  return { id, lat: 45, lng: -122, appt: null, arrivedAt: null, departedAt: null, ...over }
}

function world(over: Partial<WorldSnapshot> = {}): WorldSnapshot {
  return {
    loads: [],
    trucks: [],
    hos: [],
    invoicesPastDue: [],
    quotedCount: 7, // thermostat satisfied unless a test lowers it
    idleNpc: [],
    playerDrivers: [],
    dispatcherUserIds: [],
    invoiceSeq: 250,
    ...over,
  }
}

function sim(over: Partial<SimState> = {}): SimState {
  return {
    epoch: "epoch-1",
    lastTickAt: new Date(NOW.getTime() - 25_000).toISOString(),
    nextDropAt: null,
    activeSeats: {},
    ...over,
  }
}

/** A rolling NPC load: departed such that it is `f` of the way down the lane. */
function rollingLoad(id: string, f: number, over: Partial<SimLoad> = {}): SimLoad {
  const miles = 520
  const departed = new Date(NOW.getTime() - f * (miles / AVG_MPH) * HOUR)
  return makeLoad({
    id,
    status: "in_transit",
    loadedMiles: miles,
    driverId: `drv-${id}`,
    truckId: `trk-${id}`,
    pickup: stop(`pu-${id}`, { departedAt: departed, arrivedAt: departed }),
    delivery: stop(`de-${id}`, { lat: 47, lng: -120 }),
    ...over,
  })
}

describe("MOVE", () => {
  it("a live 25s tick writes at most one ping per truck and no arrival mid-run", () => {
    const w = world({
      loads: [rollingLoad("a", 0.5)],
      trucks: [{ truckId: "trk-a", driverId: null, lastPingAt: new Date(NOW.getTime() - 2 * MIN) }],
    })
    const { ops, catchUp } = planSandboxTick(w, sim(), NOW)
    expect(catchUp).toBe(false)
    expect(ops.filter((o) => o.op === "movePing")).toHaveLength(1)
    expect(ops.some((o) => o.op === "advanceStatus" || o.op === "stampStop")).toBe(false)
  })

  it("an NPC truck past its ETA arrives through the real stop stamp, then delivers", () => {
    const w = world({ loads: [rollingLoad("a", 1.1)] })
    const { ops } = planSandboxTick(w, sim(), NOW)
    const stamp = ops.find((o) => o.op === "stampStop")
    expect(stamp).toMatchObject({ stopId: "de-a", field: "arrived_at" })
    expect(ops).toContainEqual({ op: "advanceStatus", loadId: "a", to: "delivered" })
  })

  it("a PLAYER truck past its ETA clamps: notify once, never auto-deliver", () => {
    const load = rollingLoad("j", 1.2, { playerDriven: true, driverId: "drv-jordan" })
    const w = world({
      loads: [load],
      playerDrivers: [{ driverId: "drv-jordan", truckId: "trk-j", userId: "user-jordan", idleSincePodMin: null }],
    })
    const { ops } = planSandboxTick(w, sim(), NOW)
    expect(ops.some((o) => o.op === "advanceStatus")).toBe(false)
    expect(ops.some((o) => o.op === "stampStop")).toBe(false)
    const notify = ops.filter((o) => o.op === "notifyUser")
    expect(notify).toHaveLength(1)
    expect(notify[0]).toMatchObject({ userId: "user-jordan" })

    // Once the player (or a prior tick's notification path) marked arrival,
    // the reminder stops — no notification spam on every heartbeat.
    load.delivery!.arrivedAt = NOW
    const again = planSandboxTick(w, sim(), NOW)
    expect(again.ops.some((o) => o.op === "notifyUser")).toBe(false)
  })
})

describe("CONVERGE", () => {
  it("walks an NPC booked load to where the clock says it should be", () => {
    const appt = new Date(NOW.getTime() - 20 * MIN)
    const w = world({
      loads: [
        makeLoad({
          id: "b",
          status: "booked",
          driverId: "drv-b",
          truckId: "trk-b",
          pickup: stop("pu-b", { appt }),
          delivery: stop("de-b"),
        }),
      ],
    })
    const { ops } = planSandboxTick(w, sim(), NOW)
    expect(ops).toContainEqual({ op: "advanceStatus", loadId: "b", to: "dispatched" })
    expect(ops).toContainEqual({ op: "advanceStatus", loadId: "b", to: "at_pickup" })
    expect(ops.find((o) => o.op === "stampStop")).toMatchObject({ stopId: "pu-b", field: "arrived_at" })
    // 45-minute dock dwell hasn't elapsed — not rolling yet.
    expect(ops).not.toContainEqual({ op: "advanceStatus", loadId: "b", to: "in_transit" })
  })

  it("books stale quoted loads onto idle NPC crews, one per tick, freshest left alone", () => {
    const w = world({
      loads: [
        makeLoad({ id: "stale1", createdAt: new Date(NOW.getTime() - 3 * HOUR) }),
        makeLoad({ id: "stale2", createdAt: new Date(NOW.getTime() - 4 * HOUR) }),
        makeLoad({ id: "fresh", createdAt: new Date(NOW.getTime() - 30 * MIN) }),
      ],
      idleNpc: [
        { driverId: "d1", truckId: "t1" },
        { driverId: "d2", truckId: "t2" },
      ],
    })
    const { ops } = planSandboxTick(w, sim(), NOW)
    const books = ops.filter((o) => o.op === "npcBook")
    expect(books).toHaveLength(SIM.npcBookCap)
    // Oldest first — stale2 wins the crew.
    expect(books[0]).toMatchObject({ loadId: "stale2" })
  })

  it("the AI dispatcher offers an idle player driver a load — unless a human dispatcher is on", () => {
    const base = {
      loads: [makeLoad({ id: "q1" })],
      playerDrivers: [{ driverId: "drv-j", truckId: "trk-j", userId: "user-j", idleSincePodMin: 10 }],
    }
    const offered = planSandboxTick(world(base), sim(), NOW)
    expect(offered.ops.find((o) => o.op === "offerPlayerLoad")).toMatchObject({
      loadId: "q1",
      userId: "user-j",
    })

    const humanOn = sim({ activeSeats: { dispatcher: new Date(NOW.getTime() - 60_000).toISOString() } })
    expect(planSandboxTick(world(base), humanOn, NOW).ops.some((o) => o.op === "offerPlayerLoad")).toBe(false)

    // A stale heartbeat (beyond the presence window) no longer suppresses it.
    const humanGone = sim({
      activeSeats: { dispatcher: new Date(NOW.getTime() - (SIM.presenceWindowMinutes + 1) * MIN).toISOString() },
    })
    expect(planSandboxTick(world(base), humanGone, NOW).ops.some((o) => o.op === "offerPlayerLoad")).toBe(true)
  })
})

describe("PAPERWORK", () => {
  it("caps POD stamps per tick — 3 live, 10 on catch-up", () => {
    const delivered = Array.from({ length: 12 }, (_, i) =>
      makeLoad({ id: `d${i}`, status: "delivered", deliveredAt: new Date(NOW.getTime() - 2 * HOUR) })
    )
    const live = planSandboxTick(world({ loads: delivered }), sim(), NOW)
    expect(live.ops.filter((o) => o.op === "advanceStatus" && o.to === "pod_received")).toHaveLength(SIM.podCapLive)

    const gap = sim({ lastTickAt: new Date(NOW.getTime() - 14 * HOUR).toISOString() })
    const caught = planSandboxTick(world({ loads: delivered }), gap, NOW)
    expect(caught.catchUp).toBe(true)
    expect(caught.ops.filter((o) => o.op === "advanceStatus" && o.to === "pod_received")).toHaveLength(
      SIM.podCapCatchUp
    )
  })

  it("invoices only NPC PODs older than a day — fresh billing belongs to the player", () => {
    const w = world({
      loads: [
        makeLoad({ id: "old", status: "pod_received", deliveredAt: new Date(NOW.getTime() - 30 * HOUR) }),
        makeLoad({ id: "fresh", status: "pod_received", deliveredAt: new Date(NOW.getTime() - 3 * HOUR) }),
      ],
    })
    const { ops } = planSandboxTick(w, sim(), NOW)
    const invoices = ops.filter((o) => o.op === "autoInvoice")
    expect(invoices).toEqual([{ op: "autoInvoice", loadId: "old" }])
  })

  it("pays past-due invoices on catch-up always, and live only in a pay window", () => {
    const due = [
      { id: "inv1", customerName: "Summit" },
      { id: "inv2", customerName: "Cascade" },
      { id: "inv3", customerName: "Pacific" },
    ]
    const gap = sim({ lastTickAt: new Date(NOW.getTime() - 14 * HOUR).toISOString() })
    const caught = planSandboxTick(world({ invoicesPastDue: due }), gap, NOW)
    expect(caught.ops.filter((o) => o.op === "payInvoice")).toHaveLength(3) // ≤ payCapCatchUp

    const live = planSandboxTick(world({ invoicesPastDue: due }), sim(), NOW)
    const window = hash01(`pay-${NOW.toISOString().slice(0, 16)}`) < 0.15
    expect(live.ops.filter((o) => o.op === "payInvoice")).toHaveLength(window ? SIM.payCapLive : 0)
  })
})

describe("THERMOSTAT", () => {
  it("tops the quoted board up toward the target — 1 live, up to 4 on catch-up", () => {
    const live = planSandboxTick(world({ quotedCount: 3 }), sim(), NOW)
    expect(live.ops.filter((o) => o.op === "dropQuotedLoad")).toHaveLength(SIM.dropCapLive)
    expect(live.nextSim.nextDropAt).not.toBeNull()

    const gap = sim({ lastTickAt: new Date(NOW.getTime() - 14 * HOUR).toISOString() })
    const caught = planSandboxTick(world({ quotedCount: 3 }), gap, NOW)
    expect(caught.ops.filter((o) => o.op === "dropQuotedLoad")).toHaveLength(SIM.dropCapCatchUp)
  })

  it("a full board drops nothing, and min-spacing holds between drops", () => {
    expect(planSandboxTick(world({ quotedCount: 7 }), sim(), NOW).ops.some((o) => o.op === "dropQuotedLoad")).toBe(
      false
    )
    const spaced = sim({ nextDropAt: new Date(NOW.getTime() + 4 * MIN).toISOString() })
    expect(
      planSandboxTick(world({ quotedCount: 3 }), spaced, NOW).ops.some((o) => o.op === "dropQuotedLoad")
    ).toBe(false)
  })

  it("after hours the board rests — except the starvation floor", () => {
    const night = new Date("2026-01-15T11:00:00Z") // 03:00 PST
    const nightSim = sim({ lastTickAt: new Date(night.getTime() - 25_000).toISOString() })
    expect(
      planSandboxTick(world({ quotedCount: 3 }), nightSim, night).ops.some((o) => o.op === "dropQuotedLoad")
    ).toBe(false)
    expect(
      planSandboxTick(world({ quotedCount: 1 }), nightSim, night).ops.some((o) => o.op === "dropQuotedLoad")
    ).toBe(true)
  })
})

describe("FLAVOR + commit", () => {
  it("HOS decrements for moving drivers on a 5-minute cadence, skipping parked ones", () => {
    const w = world({
      loads: [rollingLoad("a", 0.4)],
      hos: [
        { driverId: "drv-a", driveRemainingMinutes: 300, shiftRemainingMinutes: 400, cycleRemainingMinutes: 2000, at: new Date(NOW.getTime() - 10 * MIN) },
        { driverId: "drv-parked", driveRemainingMinutes: 660, shiftRemainingMinutes: 840, cycleRemainingMinutes: 4200, at: new Date(NOW.getTime() - 10 * MIN) },
      ],
    })
    const { ops } = planSandboxTick(w, sim(), NOW)
    const hos = ops.filter((o) => o.op === "hosSnapshot")
    expect(hos).toHaveLength(1)
    expect(hos[0]).toMatchObject({ driverId: "drv-a", driveRemainingMinutes: 290 })

    // Too soon: a snapshot 2 minutes old doesn't re-emit.
    w.hos[0].at = new Date(NOW.getTime() - 2 * MIN)
    expect(planSandboxTick(w, sim(), NOW).ops.some((o) => o.op === "hosSnapshot")).toBe(false)
  })

  it("catch-up prunes old pings; the committed state carries the tick forward", () => {
    const gap = sim({ lastTickAt: new Date(NOW.getTime() - 14 * HOUR).toISOString() })
    const { ops, nextSim, catchUp } = planSandboxTick(world(), gap, NOW)
    expect(catchUp).toBe(true)
    expect(ops).toContainEqual({ op: "prunePings" })
    expect(nextSim.lastTickAt).toBe(NOW.toISOString())
    expect(nextSim.epoch).toBe("epoch-1")
  })

  it("re-planning an unchanged world at the same instant is convergent (no new domain ops)", () => {
    // A world where everything already matches the clock: rolling truck
    // mid-run with a fresh ping, full quoted board, no due paperwork.
    const w = world({
      loads: [rollingLoad("a", 0.5)],
      trucks: [{ truckId: "trk-a", driverId: null, lastPingAt: NOW }],
    })
    const { ops } = planSandboxTick(w, sim({ lastTickAt: new Date(NOW.getTime() - 21_000).toISOString() }), NOW)
    expect(ops.filter((o) => o.op !== "hosSnapshot")).toEqual([])
  })
})

describe("statusPath", () => {
  it("walks NEXT_STATUS and refuses impossible jumps", () => {
    expect(statusPath("booked", "at_pickup")).toEqual(["dispatched", "at_pickup"])
    expect(statusPath("booked", "booked")).toEqual([])
    expect(statusPath("delivered", "booked")).toEqual([])
  })
})
