/**
 * The sandbox simulation's rulebook, as a pure function: given a snapshot of
 * the world and the wall clock, decide every operation this tick performs.
 * No SQL, no side effects — sandbox-sim.ts executes the ops. All pacing caps
 * live HERE so tests can pin them.
 *
 * Roles of the AI teammates (suppressed per-seat while a human occupies that
 * seat — presence comes from tick heartbeats):
 *  - AI drivers run NPC loads: roll, arrive, deliver, send PODs.
 *  - AI dispatcher books stale quoted loads onto idle NPC drivers, and — when
 *    no human dispatcher is present — offers the player-driver a next load.
 *  - AI back office invoices old PODs and pays past-due invoices, always a
 *    beat behind, so fresh work belongs to the humans.
 *  - AI brokers keep the quoted board topped up (thermostat).
 */
import {
  etaAt,
  expectedNpcStatus,
  hash01,
  interpolate,
  isBusinessHoursPT,
  pingTimes,
  podDueAt,
  progressAt,
  topUp,
  type LatLng,
} from "./sandbox-sim-math"
import { CITIES, COMMODITY, LANES } from "./sandbox-world"
import { NEXT_STATUS, type LoadStatus } from "./types"

/* ------------------------------ snapshot types ------------------------------ */

export interface SimStop {
  id: string
  lat: number | null
  lng: number | null
  appt: Date | null
  arrivedAt: Date | null
  departedAt: Date | null
}

export interface SimLoad {
  id: string
  reference: string
  status: LoadStatus
  loadedMiles: number
  driverId: string | null
  truckId: string | null
  /** Driven by a seat driver (Jordan/Sam) — the sim never advances these on
   *  the road. The one exception is paperwork: see the POD step below. */
  playerDriven: boolean
  /** A POD document is attached to the load (the driver sent one). Optional
   *  so fixtures built before it existed stay valid — absent reads as none. */
  podOnFile?: boolean
  createdAt: Date
  deliveredAt: Date | null
  pickup: SimStop | null
  delivery: SimStop | null
}

export interface SimTruckState {
  truckId: string
  driverId: string | null
  lastPingAt: Date | null
}

export interface SimHosState {
  driverId: string
  driveRemainingMinutes: number
  shiftRemainingMinutes: number
  cycleRemainingMinutes: number
  at: Date
}

export interface SimInvoiceDue {
  id: string
  customerName: string
}

export interface WorldSnapshot {
  loads: SimLoad[]
  trucks: SimTruckState[]
  hos: SimHosState[]
  /** Invoices past due (status sent/overdue/partial), oldest first. */
  invoicesPastDue: SimInvoiceDue[]
  quotedCount: number
  /** Idle NPC driver/truck pairs available for booking. */
  idleNpc: { driverId: string; truckId: string }[]
  /** The player seat drivers: userId for notifications + idle state. */
  playerDrivers: { driverId: string; truckId: string | null; userId: string; idleSincePodMin: number | null }[]
  dispatcherUserIds: string[]
  invoiceSeq: number
  /** carrier_settings detention.freeHours, in minutes — what a hold must beat. */
  detentionFreeMinutes?: number
}

export interface SimState {
  epoch: string
  lastTickAt: string | null
  nextDropAt: string | null
  /** When the next adversity event is due (paced like nextDropAt). */
  nextTroubleAt?: string | null
  /** seatKey -> ISO lastSeenAt, maintained by the tick heartbeat. */
  activeSeats: Record<string, string>
  /** Usage counters (ticks, opsApplied, shiftsStarted_<seat>, …) — written
   *  by the executor and the shift actions, read by the weekly audit to
   *  answer "do demo users actually play?". Carried through untouched by
   *  the planner. */
  telemetry?: Record<string, number>
}

/* --------------------------------- ops --------------------------------- */

export type SimOp =
  | { op: "movePing"; truckId: string; at: Date; pos: LatLng }
  | { op: "stampStop"; loadId: string; stopId: string; field: "arrived_at" | "departed_at"; at: Date }
  | { op: "advanceStatus"; loadId: string; to: LoadStatus }
  | { op: "npcBook"; loadId: string; driverId: string; truckId: string }
  | { op: "offerPlayerLoad"; loadId: string; driverId: string; truckId: string; userId: string; reference: string }
  | {
      op: "dropQuotedLoad"
      reference: string
      originKey: string
      destKey: string
      miles: number
      equipment: "dry_van" | "reefer" | "flatbed"
      commodity: string
      linehaulCents: number
      fscCents: number
      weightLbs: number
      pickupAppt: Date
    }
  | { op: "autoInvoice"; loadId: string }
  | { op: "payInvoice"; invoiceId: string; customerName: string }
  | {
      op: "hosSnapshot"
      driverId: string
      driveRemainingMinutes: number
      shiftRemainingMinutes: number
      cycleRemainingMinutes: number
    }
  | { op: "fuelPurchase"; truckId: string; driverId: string | null; gallons: number; unitPriceCents: number; jurisdiction: string; merchant: string; externalId: string }
  | { op: "safetyEvent"; driverId: string; truckId: string; kind: string }
  | { op: "notifyUser"; userId: string; kind: string; title: string; body: string; link: string }
  | {
      /**
       * A receiver keeps the truck waiting. The sim backdates the pickup
       * arrival past the carrier's free time and leaves the departure open,
       * which is all it takes: the detention machinery that already ships
       * (getDwellingStops -> the dispatch board's "~$192, mark departed to
       * bill it" pill -> applyDetentionAccrual on departure) does the rest.
       * Recoverable by construction — marking departed BILLS the wait, so
       * the way out of the problem is also the way it turns into money.
       */
      op: "receiverHold"
      loadId: string
      stopId: string
      reference: string
      arrivedAt: Date
      needsStatus: boolean
      notifyUserIds: string[]
    }
  | { op: "prunePings" }

/* -------------------------------- pacing -------------------------------- */

export const SIM = {
  minTickSeconds: 20,
  catchUpAfterMinutes: 5,
  quotedTarget: 7,
  quotedFloor: 2,
  dropCapLive: 1,
  dropCapCatchUp: 4,
  npcBookAfterMinutes: 120,
  npcBookCap: 1,
  /** NPC lifecycle walks per tick — state-convergent rules make deferring
   *  the rest to the next beat invisible, and the cap keeps a blown-
   *  everything catch-up burst bounded (review E4). */
  convergeCapLive: 6,
  convergeCapCatchUp: 12,
  playerOfferIdleMinutes: 5,
  podCapLive: 3,
  podCapCatchUp: 10,
  invoiceAfterHours: 24,
  invoiceCap: 3,
  payCapLive: 2,
  payCapCatchUp: 5,
  pingMaxLive: 1,
  pingMaxCatchUp: 12,
  /** Per-tick ping budget across the WHOLE fleet, not per truck: MOVE is the
   *  only phase that scales with fleet size, and a 100-truck catch-up would
   *  otherwise emit >1,200 ops. Trucks are served stalest-first, so a skipped
   *  truck is simply first in line next tick — and because position is
   *  derived from departure time, its next ping is still in the right place. */
  pingBudgetLive: 40,
  pingBudgetCatchUp: 80,
  /** NPC arrivals settled per tick (stamp + status). Convergent: the rest
   *  arrive on the next beat. */
  arrivalCapLive: 6,
  arrivalCapCatchUp: 15,
  hosEveryMinutes: 5,
  presenceWindowMinutes: 2,
  /* -- trouble --------------------------------------------------------- *
   * Paced exactly like the broker thermostat (nextDropAt): a timestamp in
   * sim state, not a per-tick dice roll, so the rate is the same whether a
   * tab beats every 25s or catches up after an hour. One event per 6-10
   * minutes means a 15-minute shift meets one or two — enough that the job
   * has weather, not so much that it reads as a disaster movie. */
  troubleEveryMinutesMin: 6,
  troubleEveryMinutesMax: 10,
  /** How far past the free time a held truck sits, so the dwell is worth
   *  real money the moment the player looks at it. */
  holdOverFreeMinutes: 45,
} as const

const MOVING: LoadStatus[] = ["in_transit"]

function seatActive(sim: SimState, seatKey: string, now: Date): boolean {
  const seen = sim.activeSeats?.[seatKey]
  if (!seen) return false
  return now.getTime() - new Date(seen).getTime() < SIM.presenceWindowMinutes * 60_000
}

/** Walk NEXT_STATUS from `from` toward `to`; returns the step list (≤4). */
export function statusPath(from: LoadStatus, to: LoadStatus): LoadStatus[] {
  const path: LoadStatus[] = []
  let cursor = from
  for (let i = 0; i < 4 && cursor !== to; i++) {
    const next = NEXT_STATUS[cursor]
    if (!next) break
    path.push(next)
    cursor = next
  }
  return cursor === to ? path : []
}

/* ------------------------------ the planner ------------------------------ */

export function planSandboxTick(
  world: WorldSnapshot,
  sim: SimState,
  now: Date
): { ops: SimOp[]; nextSim: SimState; catchUp: boolean } {
  const ops: SimOp[] = []
  const lastTick = sim.lastTickAt ? new Date(sim.lastTickAt) : null
  const elapsedMs = lastTick ? now.getTime() - lastTick.getTime() : 0
  const catchUp = elapsedMs > SIM.catchUpAfterMinutes * 60_000

  const truckState = new Map(world.trucks.map((t) => [t.truckId, t]))
  const humanDispatcher = seatActive(sim, "dispatcher", now)

  /* 1 · MOVE — every in-transit truck, player and NPC alike.
   *
   * This is the only phase that scales with fleet size, so it runs on a
   * budget: trails are planned per truck, then served stalest-first until
   * the tick's ping budget is spent. Arrivals are capped the same way. Both
   * are safe to defer precisely because the rules are state-convergent —
   * position and status are derived from timestamps, so a truck skipped this
   * tick is simply first in line on the next one, in the right place. */
  const rolling = world.loads
    .filter((l) => MOVING.includes(l.status) && l.truckId && l.pickup?.departedAt && l.delivery)
    .map((load) => {
      const departed = load.pickup!.departedAt as Date
      return {
        load,
        departed,
        eta: etaAt(departed, load.loadedMiles),
        f: progressAt(departed, now, load.loadedMiles),
        last: truckState.get(load.truckId as string)?.lastPingAt ?? null,
      }
    })

  let pingBudget = catchUp ? SIM.pingBudgetCatchUp : SIM.pingBudgetLive
  const stalestFirst = [...rolling].sort(
    (a, b) => (a.last?.getTime() ?? 0) - (b.last?.getTime() ?? 0)
  )
  for (const { load, departed, eta, last } of stalestFirst) {
    if (pingBudget <= 0) break
    const origin = { lat: load.pickup!.lat ?? 0, lng: load.pickup!.lng ?? 0 }
    const dest = { lat: load.delivery!.lat ?? 0, lng: load.delivery!.lng ?? 0 }
    const times = pingTimes(last, eta, now, catchUp ? SIM.pingMaxCatchUp : SIM.pingMaxLive).slice(0, pingBudget)
    for (const at of times) {
      const ft = progressAt(departed, at, load.loadedMiles)
      ops.push({ op: "movePing", truckId: load.truckId as string, at, pos: interpolate(origin, dest, ft, load.id) })
    }
    pingBudget -= times.length
  }

  let arrivals = catchUp ? SIM.arrivalCapCatchUp : SIM.arrivalCapLive
  for (const { load, eta, f } of rolling) {
    if (f < 1) continue
    if (load.playerDriven) {
      // Clamp at the receiver; the human marks delivered. Notify once per
      // arrival — never budgeted away, there are at most two player drivers
      // and being told you've arrived is the point of the seat.
      const player = world.playerDrivers.find((p) => p.driverId === load.driverId)
      if (player && !load.delivery!.arrivedAt) {
        ops.push({
          op: "notifyUser",
          userId: player.userId,
          kind: "message",
          title: "You've arrived",
          body: `${load.reference} is at the receiver — mark delivered when unloaded.`,
          link: "/hub/driver",
        })
      }
      continue
    }
    if (arrivals <= 0) continue
    if (!load.delivery!.arrivedAt) {
      ops.push({ op: "stampStop", loadId: load.id, stopId: load.delivery!.id, field: "arrived_at", at: eta })
    }
    ops.push({ op: "advanceStatus", loadId: load.id, to: "delivered" })
    arrivals--
  }

  /* 2 · CONVERGE — NPC lifecycle toward what the clock says. */
  const convergeCap = catchUp ? SIM.convergeCapCatchUp : SIM.convergeCapLive
  let converged = 0
  for (const load of world.loads) {
    if (converged >= convergeCap) break
    if (load.playerDriven) continue
    if (!["booked", "dispatched", "at_pickup"].includes(load.status)) continue
    if (!load.driverId || !load.pickup) continue
    const target = expectedNpcStatus({
      status: load.status,
      pickupAppt: load.pickup.appt,
      pickupDepartedAt: load.pickup.departedAt,
      loadedMiles: load.loadedMiles,
      now,
    })
    const path = statusPath(load.status, target === "delivered" ? "in_transit" : target)
    for (const step of path) {
      if (step === "at_pickup" && !load.pickup.arrivedAt && load.pickup.appt) {
        ops.push({ op: "stampStop", loadId: load.id, stopId: load.pickup.id, field: "arrived_at", at: load.pickup.appt })
      }
      if (step === "in_transit" && !load.pickup.departedAt && load.pickup.appt) {
        ops.push({
          op: "stampStop",
          loadId: load.id,
          stopId: load.pickup.id,
          field: "departed_at",
          at: new Date(load.pickup.appt.getTime() + 45 * 60_000),
        })
      }
      ops.push({ op: "advanceStatus", loadId: load.id, to: step })
    }
    if (path.length > 0) converged++
  }

  // AI dispatcher: book stale quoted loads onto idle NPC drivers.
  const staleQuoted = world.loads
    .filter(
      (l) =>
        l.status === "quoted" &&
        now.getTime() - l.createdAt.getTime() > SIM.npcBookAfterMinutes * 60_000
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  let booked = 0
  const npcPool = [...world.idleNpc]
  for (const load of staleQuoted) {
    if (booked >= SIM.npcBookCap) break
    const crew = npcPool.shift()
    if (!crew) break
    ops.push({ op: "npcBook", loadId: load.id, driverId: crew.driverId, truckId: crew.truckId })
    booked++
  }

  // AI dispatcher offers the player's driver a next load — only when no human
  // dispatcher is on shift (a human present means that's THEIR call).
  if (!humanDispatcher) {
    for (const player of world.playerDrivers) {
      if (player.idleSincePodMin === null || player.idleSincePodMin < SIM.playerOfferIdleMinutes) continue
      const offer = world.loads.find((l) => l.status === "quoted" && !ops.some((o) => "loadId" in o && o.loadId === l.id))
      if (!offer || !player.truckId) continue
      ops.push({
        op: "offerPlayerLoad",
        loadId: offer.id,
        driverId: player.driverId,
        truckId: player.truckId,
        userId: player.userId,
        reference: offer.reference,
      })
      break // one offer per tick
    }
  }

  /* 3 · PAPERWORK — deliberately a beat behind the humans. */
  let pods = 0
  for (const load of world.loads) {
    if (load.status !== "delivered" || !load.deliveredAt) continue
    if (pods >= (catchUp ? SIM.podCapCatchUp : SIM.podCapLive)) break
    if (load.playerDriven) {
      // The player's paperwork is theirs to send — the sim never invents a
      // POD for a human. But once one is on file, the back office confirms
      // it the same way it confirms an NPC's, because nobody else is going
      // to: a player load parked at 'delivered' never reaches the
      // accountant's queue, and the driver's idle clock (which starts at
      // pod_received) never starts, so dispatch never offers the next load.
      if (load.podOnFile) {
        ops.push({ op: "advanceStatus", loadId: load.id, to: "pod_received" })
        pods++
      }
      continue
    }
    if (now >= podDueAt(load.deliveredAt, load.id)) {
      ops.push({ op: "advanceStatus", loadId: load.id, to: "pod_received" })
      pods++
    }
  }
  let invoiced = 0
  for (const load of world.loads) {
    if (load.playerDriven || load.status !== "pod_received" || !load.deliveredAt) continue
    if (invoiced >= SIM.invoiceCap) break
    if (now.getTime() - load.deliveredAt.getTime() > SIM.invoiceAfterHours * 3_600_000) {
      ops.push({ op: "autoInvoice", loadId: load.id })
      invoiced++
    }
  }
  // AP runs on office time: a payment batch lands roughly every few minutes
  // (minute-keyed hash so same-minute ticks agree), not on every heartbeat —
  // catch-up always pays so overnight gaps clear the aging report.
  const payWindow = catchUp || hash01(`pay-${now.toISOString().slice(0, 16)}`) < 0.15
  if (payWindow) {
    const payCap = catchUp ? SIM.payCapCatchUp : SIM.payCapLive
    for (const invoice of world.invoicesPastDue.slice(0, payCap)) {
      ops.push({ op: "payInvoice", invoiceId: invoice.id, customerName: invoice.customerName })
    }
  }

  /* 4 · THERMOSTAT — AI brokers keep the board stocked. */
  const nextDropAt = sim.nextDropAt ? new Date(sim.nextDropAt) : null
  let newNextDropAt = sim.nextDropAt
  const canDrop =
    world.quotedCount < SIM.quotedTarget &&
    (!nextDropAt || now >= nextDropAt) &&
    (isBusinessHoursPT(now) || world.quotedCount < SIM.quotedFloor)
  if (canDrop) {
    const n = topUp(world.quotedCount, SIM.quotedTarget, catchUp ? SIM.dropCapCatchUp : SIM.dropCapLive)
    for (let i = 0; i < n; i++) {
      const seedKey = `${now.toISOString().slice(0, 16)}-${i}`
      const lane = LANES[Math.floor(hash01(`lane-${seedKey}`) * LANES.length)]
      const equipment = (["dry_van", "dry_van", "reefer", "flatbed"] as const)[
        Math.floor(hash01(`eq-${seedKey}`) * 4)
      ]
      const miles = lane[2]
      const rate = equipment === "reefer" ? 2.7 : equipment === "flatbed" ? 2.5 : 2.2
      ops.push({
        op: "dropQuotedLoad",
        reference: `BRH-${3000 + ((world.invoiceSeq + i) % 900)}-${seedKey.slice(11, 16).replace(":", "")}`,
        originKey: lane[0],
        destKey: lane[1],
        miles,
        equipment,
        commodity: COMMODITY[equipment][Math.floor(hash01(`com-${seedKey}`) * COMMODITY[equipment].length)],
        linehaulCents: Math.round(miles * rate) * 100,
        fscCents: Math.round(miles * 0.4) * 100,
        weightLbs: 28000 + Math.floor(hash01(`wt-${seedKey}`) * 17000),
        pickupAppt: new Date(now.getTime() + (1 + hash01(`appt-${seedKey}`) * 5) * 3_600_000),
      })
    }
    if (n > 0) {
      newNextDropAt = new Date(now.getTime() + (5 + hash01(now.toISOString()) * 5) * 60_000).toISOString()
    }
  }

  /* 5 · FLAVOR — HOS, fuel, safety; hard-capped. */
  const movingDrivers = new Set(
    world.loads.filter((l) => MOVING.includes(l.status) && l.driverId).map((l) => l.driverId as string)
  )
  for (const hos of world.hos) {
    if (!movingDrivers.has(hos.driverId)) continue
    const sinceMin = (now.getTime() - hos.at.getTime()) / 60_000
    if (sinceMin < SIM.hosEveryMinutes) continue
    const spent = Math.round(sinceMin)
    ops.push({
      op: "hosSnapshot",
      driverId: hos.driverId,
      driveRemainingMinutes: Math.max(0, hos.driveRemainingMinutes - spent),
      shiftRemainingMinutes: Math.max(0, hos.shiftRemainingMinutes - spent),
      cycleRemainingMinutes: Math.max(0, hos.cycleRemainingMinutes - spent),
    })
  }
  // ~1 fuel stop per 45 moving-minutes across the fleet, ≤1/tick.
  const movingTrucks = world.loads.filter((l) => MOVING.includes(l.status) && l.truckId && !l.playerDriven)
  if (movingTrucks.length > 0 && hash01(`fuel-${now.toISOString().slice(0, 16)}`) < Math.min(0.5, elapsedMs / 2_700_000)) {
    const pickIdx = Math.floor(hash01(`fuelpick-${now.toISOString().slice(0, 16)}`) * movingTrucks.length)
    const load = movingTrucks[pickIdx]
    const gallons = 60 + Math.floor(hash01(`gal-${load.id}`) * 60)
    ops.push({
      op: "fuelPurchase",
      truckId: load.truckId as string,
      driverId: load.driverId,
      gallons,
      unitPriceCents: 370 + Math.floor(hash01(`price-${load.id}`) * 60),
      jurisdiction: "OR",
      merchant: "Pilot #482",
      externalId: `SIM-F-${now.toISOString().slice(0, 16)}-${(load.truckId as string).slice(0, 8)}`,
    })
  }
  /* 6 · TROUBLE — the one thing in here that is not the world going right.
   *
   * Everything else this planner does advances the company: trucks roll,
   * brokers call, paperwork lands, money arrives. A dispatcher screen where
   * every load delivers itself is a screensaver, and — the part that matters
   * for someone deciding whether to run their business on this — it never
   * shows the software doing the job it exists to do, which is telling you
   * something is wrong while there is still time to fix it.
   *
   * Recoverable by construction: a hold releases itself, and the player's way
   * out (mark departed) is the same action that bills the detention. Nothing
   * here can strand a shift. */
  const troubleDue = !sim.nextTroubleAt || now >= new Date(sim.nextTroubleAt)
  let newNextTroubleAt = sim.nextTroubleAt
  if (troubleDue) {
    const freeMinutes = world.detentionFreeMinutes ?? 120
    // Only a truck that is sitting at a shipper can be held, and only one
    // that is not already dwelling — re-holding a held load would keep
    // resetting its clock and the dwell would never grow.
    const holdable = world.loads.filter(
      (l) =>
        !l.playerDriven &&
        l.driverId !== null &&
        l.truckId !== null &&
        l.pickup !== null &&
        !l.pickup.departedAt &&
        ["dispatched", "at_pickup"].includes(l.status) &&
        !(l.pickup.arrivedAt && now.getTime() - l.pickup.arrivedAt.getTime() > freeMinutes * 60_000)
    )
    if (holdable.length > 0) {
      // Deterministic pick, like the broker draw — the same world replays the
      // same trouble, which is the whole point of a reproducible sandbox.
      const load = holdable[Math.floor(hash01(`hold-${now.toISOString().slice(0, 16)}`) * holdable.length)]
      if (load?.pickup) {
        ops.push({
          op: "receiverHold",
          loadId: load.id,
          stopId: load.pickup.id,
          reference: load.reference,
          arrivedAt: new Date(now.getTime() - (freeMinutes + SIM.holdOverFreeMinutes) * 60_000),
          needsStatus: load.status !== "at_pickup",
          notifyUserIds: world.dispatcherUserIds,
        })
      }
    }
    const gap =
      SIM.troubleEveryMinutesMin +
      hash01(`trouble-${now.toISOString().slice(0, 16)}`) *
        (SIM.troubleEveryMinutesMax - SIM.troubleEveryMinutesMin)
    newNextTroubleAt = new Date(now.getTime() + gap * 60_000).toISOString()
  }

  if (movingTrucks.length > 0 && hash01(`safety-${now.toISOString().slice(0, 13)}`) < Math.min(0.3, elapsedMs / 7_200_000)) {
    const load = movingTrucks[0]
    if (load.driverId && load.truckId) {
      ops.push({
        op: "safetyEvent",
        driverId: load.driverId,
        truckId: load.truckId,
        kind: hash01(`sk-${load.id}`) < 0.6 ? "hard_brake" : "speeding",
      })
    }
  }
  if (catchUp) ops.push({ op: "prunePings" })

  return {
    ops,
    nextSim: { ...sim, lastTickAt: now.toISOString(), nextDropAt: newNextDropAt, nextTroubleAt: newNextTroubleAt },
    catchUp,
  }
}
