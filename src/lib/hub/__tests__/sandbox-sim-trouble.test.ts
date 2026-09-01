/**
 * The part of the simulation where something goes wrong.
 *
 * Every other rule in the planner advances the company. This one is the only
 * thing that costs the player anything, so it gets held to two promises:
 *
 *   1. It actually fires. An adversity generator that never generates
 *      adversity is the most flattering bug possible — the world looks calm
 *      and everyone concludes the software is easy to run.
 *   2. It is PACED, not rolled per tick. `nextTroubleAt` is a timestamp in sim
 *      state, exactly like the broker thermostat's `nextDropAt`, so the rate
 *      is the same whether a tab beats every 25 seconds or catches up after an
 *      hour asleep. A per-tick dice roll would quietly make trouble a function
 *      of how often somebody's laptop woke up.
 */
import { describe, expect, it } from "vitest"
import { planSandboxTick, SIM, type SimOp, type SimState, type WorldSnapshot } from "../sandbox-sim-plan"

const NOW = new Date("2026-08-15T18:00:00.000Z")

function stop(id: string, over: Partial<{ arrivedAt: Date | null; departedAt: Date | null }> = {}) {
  return {
    id,
    appt: new Date(NOW.getTime() - 60 * 60_000),
    arrivedAt: null,
    departedAt: null,
    lat: 47.4,
    lng: -122.2,
    ...over,
  }
}

function world(over: Partial<WorldSnapshot> = {}): WorldSnapshot {
  return {
    loads: [
      {
        id: "load-1",
        reference: "BRH-9001",
        status: "dispatched",
        loadedMiles: 400,
        driverId: "drv-1",
        truckId: "trk-1",
        playerDriven: false,
        createdAt: new Date(NOW.getTime() - 6 * 3600_000),
        deliveredAt: null,
        pickup: stop("stop-1"),
        delivery: stop("stop-2"),
      },
    ],
    trucks: [],
    hos: [],
    invoicesPastDue: [],
    quotedCount: 7,
    idleNpc: [],
    playerDrivers: [],
    dispatcherUserIds: ["user-dispatch"],
    invoiceSeq: 3000,
    detentionFreeMinutes: 120,
    ...over,
  }
}

const simState = (over: Partial<SimState> = {}): SimState => ({
  epoch: "e1",
  lastTickAt: new Date(NOW.getTime() - 30_000).toISOString(),
  nextDropAt: new Date(NOW.getTime() + 3600_000).toISOString(),
  activeSeats: {},
  ...over,
})

const holds = (ops: SimOp[]) => ops.filter((o) => o.op === "receiverHold")

describe("the sim can cause trouble", () => {
  it("holds a truck at the shipper when trouble is due", () => {
    const { ops } = planSandboxTick(world(), simState({ nextTroubleAt: null }), NOW)
    const held = holds(ops)
    expect(held).toHaveLength(1)
    expect(held[0]).toMatchObject({ loadId: "load-1", stopId: "stop-1", reference: "BRH-9001" })
  })

  it("backdates the arrival past the carrier's free time, so the wait is worth money", () => {
    // A hold that does not beat the free hours costs nothing and teaches
    // nothing — the dispatch board would show a dwell of $0.
    const { ops } = planSandboxTick(world(), simState({ nextTroubleAt: null }), NOW)
    const held = holds(ops)[0]
    if (held.op !== "receiverHold") throw new Error("expected a hold")
    const minutesSitting = (NOW.getTime() - held.arrivedAt.getTime()) / 60_000
    expect(minutesSitting).toBeGreaterThan(120)
    expect(minutesSitting).toBe(120 + SIM.holdOverFreeMinutes)
  })

  it("tells the dispatcher, because a problem nobody is told about is just a loss", () => {
    const { ops } = planSandboxTick(world(), simState({ nextTroubleAt: null }), NOW)
    const held = holds(ops)[0]
    if (held.op !== "receiverHold") throw new Error("expected a hold")
    expect(held.notifyUserIds).toContain("user-dispatch")
  })

  it("stays quiet until the next one is due", () => {
    const later = simState({ nextTroubleAt: new Date(NOW.getTime() + 5 * 60_000).toISOString() })
    expect(holds(planSandboxTick(world(), later, NOW).ops)).toHaveLength(0)
  })

  it("paces the next one 6-10 minutes out, whatever the tick rate", () => {
    const { nextSim } = planSandboxTick(world(), simState({ nextTroubleAt: null }), NOW)
    const gapMin = (new Date(nextSim.nextTroubleAt!).getTime() - NOW.getTime()) / 60_000
    expect(gapMin).toBeGreaterThanOrEqual(SIM.troubleEveryMinutesMin)
    expect(gapMin).toBeLessThanOrEqual(SIM.troubleEveryMinutesMax)
  })

  it("does the same thing to the same world twice — trouble is reproducible", () => {
    const a = planSandboxTick(world(), simState({ nextTroubleAt: null }), NOW)
    const b = planSandboxTick(world(), simState({ nextTroubleAt: null }), NOW)
    expect(JSON.stringify(a.ops)).toBe(JSON.stringify(b.ops))
  })

  it("never holds a load the player is driving", () => {
    // The player's taps are theirs. The sim may let a receiver keep them
    // waiting, but it must never stamp their stops for them.
    const playerWorld = world({
      loads: [{ ...world().loads[0], playerDriven: true }],
    })
    expect(holds(planSandboxTick(playerWorld, simState({ nextTroubleAt: null }), NOW).ops)).toHaveLength(0)
  })

  it("never re-holds a truck that is already sitting", () => {
    // Re-holding would reset the clock every few minutes and the dwell would
    // never grow past the free time — trouble that can never cost anything.
    const alreadySitting = world({
      loads: [
        {
          ...world().loads[0],
          status: "at_pickup",
          pickup: stop("stop-1", { arrivedAt: new Date(NOW.getTime() - 5 * 3600_000) }),
        },
      ],
    })
    expect(holds(planSandboxTick(alreadySitting, simState({ nextTroubleAt: null }), NOW).ops)).toHaveLength(0)
  })

  it("holds nothing when no truck is at a shipper", () => {
    const rolling = world({ loads: [{ ...world().loads[0], status: "in_transit" }] })
    expect(holds(planSandboxTick(rolling, simState({ nextTroubleAt: null }), NOW).ops)).toHaveLength(0)
  })
})
