/**
 * The one piece of a player's paperwork the sim IS allowed to touch.
 *
 * Player loads are sacred on the road — the planner never arrives, loads or
 * delivers for a human. But a load the human has delivered AND sent the POD
 * for used to sit at 'delivered' forever: the office never confirmed it (the
 * NPC path skipped player loads), so it never reached the accountant's
 * queue, the driver's idle clock never started, and dispatch never offered
 * the next load. A driver's best possible shift was one leg and no POD.
 *
 * Rule: a POD on file is the human's signal; confirming it is the back
 * office's job and happens on the next tick. No POD, no move — ever.
 */
import { describe, expect, it } from "vitest"
import { planSandboxTick, type SimLoad, type SimState, type WorldSnapshot } from "../sandbox-sim-plan"

const MIN = 60_000
const NOW = new Date("2026-01-15T18:00:00Z")

function delivered(id: string, over: Partial<SimLoad> = {}): SimLoad {
  return {
    id,
    reference: `BRH-${id}`,
    status: "delivered",
    loadedMiles: 300,
    driverId: `drv-${id}`,
    truckId: `trk-${id}`,
    playerDriven: false,
    createdAt: new Date(NOW.getTime() - 6 * 60 * MIN),
    deliveredAt: new Date(NOW.getTime() - 90 * MIN), // long past any POD due time
    pickup: { id: `pu-${id}`, lat: 45, lng: -122, appt: null, arrivedAt: null, departedAt: null },
    delivery: { id: `de-${id}`, lat: 47, lng: -120, appt: null, arrivedAt: null, departedAt: null },
    ...over,
  }
}

function world(loads: SimLoad[]): WorldSnapshot {
  return {
    loads,
    trucks: [],
    hos: [],
    invoicesPastDue: [],
    quotedCount: 7,
    idleNpc: [],
    playerDrivers: [],
    dispatcherUserIds: [],
    invoiceSeq: 250,
  }
}

const sim: SimState = {
  epoch: "epoch-1",
  lastTickAt: new Date(NOW.getTime() - 25_000).toISOString(),
  nextDropAt: null,
  activeSeats: {},
}

const podMoves = (loads: SimLoad[]) =>
  planSandboxTick(world(loads), sim, NOW).ops.filter(
    (op) => op.op === "advanceStatus" && op.to === "pod_received"
  )

describe("player POD confirmation", () => {
  it("leaves a player's delivered load alone until a POD is on file", () => {
    const moves = podMoves([delivered("p", { playerDriven: true, podOnFile: false })])
    expect(moves).toEqual([])
  })

  it("confirms the player's POD on the next tick once one is on file", () => {
    const moves = podMoves([delivered("p", { playerDriven: true, podOnFile: true })])
    expect(moves.map((m) => "loadId" in m && m.loadId)).toEqual(["p"])
  })

  it("does not confuse a POD on file with a load that is not delivered yet", () => {
    // Still rolling: the human has not marked delivered, whatever is attached.
    const moves = podMoves([delivered("p", { playerDriven: true, podOnFile: true, status: "in_transit" })])
    expect(moves).toEqual([])
  })

  it("still photographs NPC PODs on their own clock, POD or no POD", () => {
    const moves = podMoves([delivered("n", { playerDriven: false, podOnFile: false })])
    expect(moves.map((m) => "loadId" in m && m.loadId)).toEqual(["n"])
  })

  it("counts a player confirmation against the same per-tick cap as everyone else", () => {
    const loads = [
      delivered("p1", { playerDriven: true, podOnFile: true }),
      delivered("p2", { playerDriven: true, podOnFile: true }),
      delivered("n1"), delivered("n2"), delivered("n3"), delivered("n4"),
    ]
    // Live cap is 3 (SIM.podCapLive): the two players come first in the list
    // and take two of the slots; one NPC gets the third.
    expect(podMoves(loads)).toHaveLength(3)
  })
})
