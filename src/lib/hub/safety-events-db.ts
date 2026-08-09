import { query } from "./db"
import {
  SAFETY_MIN_WINDOW_MILES,
  SAFETY_WINDOW_WEEKS,
  currentSafetyScore,
  recentWeekStarts,
  scoreFromRate,
  weeklySafetyScores,
  weightedEventTotal,
  type SafetyEventKind,
  type SafetyWeek,
  type SafetyWeekScore,
} from "./safety-score"

/**
 * Fleet safety score data (Motive-class): safety_events + delivered-load miles,
 * bucketed by ISO week. All reads carrier-scoped.
 */

const DELIVERED_STATUSES = "('delivered','pod_received','invoiced','paid','settled')"

interface WeekKindRow {
  week_start: string
  kind: SafetyEventKind
  n: number
}
interface WeekMilesRow {
  week_start: string
  miles: number
}

/** The last `weekCount` weeks of events + miles, ascending, zero-filled. */
export async function fleetSafetyWeeks(carrierId: string, weekCount = 12): Promise<SafetyWeek[]> {
  const weekStarts = recentWeekStarts(new Date(), weekCount)
  const since = `${weekStarts[0]}T00:00:00Z`
  const [events, miles] = await Promise.all([
    query<WeekKindRow>(
      `SELECT to_char(date_trunc('week', occurred_at), 'YYYY-MM-DD') AS week_start,
              kind, COUNT(*)::int AS n
         FROM hub.safety_events
        WHERE carrier_id = $1 AND occurred_at >= $2
        GROUP BY 1, 2`,
      [carrierId, since]
    ),
    query<WeekMilesRow>(
      `SELECT to_char(date_trunc('week', COALESCE(delivered_at, created_at)), 'YYYY-MM-DD') AS week_start,
              COALESCE(SUM(COALESCE(loaded_miles, 0) + COALESCE(deadhead_miles, 0)), 0)::int AS miles
         FROM hub.loads
        WHERE carrier_id = $1
          AND status IN ${DELIVERED_STATUSES}
          AND COALESCE(delivered_at, created_at) >= $2
        GROUP BY 1`,
      [carrierId, since]
    ),
  ])
  const milesByWeek = new Map(miles.map((r) => [r.week_start, Number(r.miles)]))
  const eventsByWeek = new Map<string, Partial<Record<SafetyEventKind, number>>>()
  for (const row of events) {
    const bucket = eventsByWeek.get(row.week_start) ?? {}
    bucket[row.kind] = (bucket[row.kind] ?? 0) + Number(row.n)
    eventsByWeek.set(row.week_start, bucket)
  }
  return weekStarts.map((weekStart) => ({
    weekStart,
    miles: milesByWeek.get(weekStart) ?? 0,
    events: eventsByWeek.get(weekStart) ?? {},
  }))
}

export interface FleetSafetySnapshot {
  series: SafetyWeekScore[]
  current: SafetyWeekScore | null
  /** Raw event counts by kind over the trailing window. */
  kindMix: Partial<Record<SafetyEventKind, number>>
}

export async function fleetSafetySnapshot(carrierId: string): Promise<FleetSafetySnapshot> {
  const weeks = await fleetSafetyWeeks(carrierId, 12)
  const series = weeklySafetyScores(weeks)
  const windowWeeks = weeks.slice(-SAFETY_WINDOW_WEEKS)
  const kindMix: Partial<Record<SafetyEventKind, number>> = {}
  for (const week of windowWeeks) {
    for (const [kind, n] of Object.entries(week.events) as [SafetyEventKind, number][]) {
      if (n > 0) kindMix[kind] = (kindMix[kind] ?? 0) + n
    }
  }
  return { series, current: currentSafetyScore(series), kindMix }
}

export interface DriverSafetyRow {
  driverId: string
  name: string
  events: number
  weighted: number
  miles: number
  /** null when the driver has too few miles to score fairly. */
  score: number | null
}

/** Per-driver scores over the trailing window; riskiest first. */
export async function driverSafetyBoard(carrierId: string, limit = 6): Promise<DriverSafetyRow[]> {
  const windowStarts = recentWeekStarts(new Date(), SAFETY_WINDOW_WEEKS)
  const since = `${windowStarts[0]}T00:00:00Z`
  const [events, miles] = await Promise.all([
    query<{ driver_id: string; name: string; kind: SafetyEventKind; n: number }>(
      `SELECT e.driver_id, d.first_name || ' ' || d.last_name AS name, e.kind, COUNT(*)::int AS n
         FROM hub.safety_events e
         JOIN hub.drivers d ON d.id = e.driver_id
        WHERE e.carrier_id = $1 AND e.occurred_at >= $2 AND e.driver_id IS NOT NULL
        GROUP BY 1, 2, 3`,
      [carrierId, since]
    ),
    query<{ driver_id: string; name: string; miles: number }>(
      `SELECT l.driver_id, d.first_name || ' ' || d.last_name AS name,
              COALESCE(SUM(COALESCE(l.loaded_miles, 0) + COALESCE(l.deadhead_miles, 0)), 0)::int AS miles
         FROM hub.loads l
         JOIN hub.drivers d ON d.id = l.driver_id
        WHERE l.carrier_id = $1
          AND l.status IN ${DELIVERED_STATUSES}
          AND COALESCE(l.delivered_at, l.created_at) >= $2
          AND l.driver_id IS NOT NULL
        GROUP BY 1, 2`,
      [carrierId, since]
    ),
  ])
  const byDriver = new Map<string, DriverSafetyRow & { kinds: Partial<Record<SafetyEventKind, number>> }>()
  const ensure = (driverId: string, name: string) => {
    let row = byDriver.get(driverId)
    if (!row) {
      row = { driverId, name, events: 0, weighted: 0, miles: 0, score: null, kinds: {} }
      byDriver.set(driverId, row)
    }
    return row
  }
  for (const r of miles) ensure(r.driver_id, r.name).miles = Number(r.miles)
  for (const r of events) {
    const row = ensure(r.driver_id, r.name)
    row.events += Number(r.n)
    row.kinds[r.kind] = (row.kinds[r.kind] ?? 0) + Number(r.n)
  }
  const rows = [...byDriver.values()].map((row) => {
    row.weighted = weightedEventTotal(row.kinds)
    if (row.miles >= SAFETY_MIN_WINDOW_MILES) {
      row.score = scoreFromRate((row.weighted / row.miles) * 1000)
    }
    return row
  })
  return rows
    .filter((row) => row.score !== null || row.events > 0)
    .sort((a, b) => (a.score ?? 101) - (b.score ?? 101) || b.weighted - a.weighted)
    .slice(0, limit)
}
