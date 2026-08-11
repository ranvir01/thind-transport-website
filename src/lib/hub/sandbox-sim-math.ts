/**
 * Pure math for the sandbox's real-time simulation. No SQL, no Date.now() —
 * every function takes `now` explicitly so the whole rulebook is
 * deterministic and unit-testable.
 *
 * Core idea (state-convergent): positions and statuses are derived from
 * *timestamps the world already carries* (departure times, appointment
 * times, delivery times) evaluated at `now` — never from "elapsed since the
 * last tick". Re-running any tick converges to the same world.
 */
import { AVG_MPH } from "./sandbox-world"
import type { LoadStatus } from "./types"

export interface LatLng {
  lat: number
  lng: number
}

/** Deterministic 0..1 hash of a string (per-load jitter, POD delays…). */
export function hash01(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

/** Point between origin and dest at fraction f (clamped), with a small
 *  deterministic per-key jitter so parallel trucks don't stack pixel-perfect. */
export function interpolate(origin: LatLng, dest: LatLng, f: number, jitterKey = ""): LatLng {
  const t = Math.min(1, Math.max(0, f))
  const jitter = jitterKey ? (hash01(jitterKey) - 0.5) * 0.06 : 0
  return {
    lat: origin.lat + (dest.lat - origin.lat) * t + jitter,
    lng: origin.lng + (dest.lng - origin.lng) * t + jitter,
  }
}

/** Fraction of the run completed at `now` for a truck that departed at
 *  `departedAt` on a `miles` lane. ≥1 means it should have arrived. */
export function progressAt(departedAt: Date, now: Date, miles: number, mph = AVG_MPH): number {
  if (miles <= 0) return 1
  const hours = (now.getTime() - departedAt.getTime()) / 3_600_000
  return Math.max(0, (hours * mph) / miles)
}

/** When a run that departed at `departedAt` reaches the receiver. */
export function etaAt(departedAt: Date, miles: number, mph = AVG_MPH): Date {
  return new Date(departedAt.getTime() + (miles / mph) * 3_600_000)
}

/** NPC drivers photograph the POD 10–20 minutes after delivery
 *  (deterministic per load). */
export function podDueAt(deliveredAt: Date, loadId: string): Date {
  return new Date(deliveredAt.getTime() + (10 + hash01(loadId) * 10) * 60_000)
}

/**
 * The status an NPC-driven load *should* have at `now`, from its pickup
 * appointment and (once rolling) its departure time. The sim walks
 * NEXT_STATUS toward this — never past what the timeline supports.
 */
export function expectedNpcStatus(args: {
  status: LoadStatus
  pickupAppt: Date | null
  pickupDepartedAt: Date | null
  loadedMiles: number
  now: Date
}): LoadStatus {
  const { status, pickupAppt, pickupDepartedAt, loadedMiles, now } = args
  if (status === "quoted" || status === "cancelled") return status
  if (pickupDepartedAt) {
    return progressAt(pickupDepartedAt, now, loadedMiles) >= 1 ? "delivered" : "in_transit"
  }
  if (!pickupAppt) return status
  const apptMs = pickupAppt.getTime()
  const nowMs = now.getTime()
  if (nowMs >= apptMs + 45 * 60_000) return "in_transit" // ~45 min dock dwell, then rolling
  if (nowMs >= apptMs) return "at_pickup"
  if (nowMs >= apptMs - 2 * 3_600_000) return "dispatched" // NPC driver heads out 2h ahead
  return status
}

/** Hour of day (0–23) in Pacific Time — the carrier's operating timezone. */
export function hourInPT(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      hour12: false,
    }).format(now)
  )
}

/** Brokers call 06:00–20:00 PT. */
export function isBusinessHoursPT(now: Date): boolean {
  const h = hourInPT(now)
  return h >= 6 && h < 20
}

/**
 * Ping timestamps to emit for a moving truck: at most one per minute of
 * wall time, capped at `maxPings` (catch-up writes a sparse trail, not an
 * overnight firehose). Evenly spaced across (lastPingAt, until].
 */
export function pingTimes(lastPingAt: Date | null, until: Date, now: Date, maxPings: number): Date[] {
  const end = Math.min(until.getTime(), now.getTime())
  const start = lastPingAt ? lastPingAt.getTime() : end - 60_000
  if (end - start < 60_000 || maxPings <= 0) return []
  const wanted = Math.floor((end - start) / 60_000)
  const count = Math.min(wanted, maxPings)
  const step = (end - start) / count
  return Array.from({ length: count }, (_, i) => new Date(start + step * (i + 1)))
}

/** How many items to create to reach `target`, never exceeding `cap`. */
export function topUp(current: number, target: number, cap: number): number {
  return Math.min(Math.max(target - current, 0), Math.max(cap, 0))
}
