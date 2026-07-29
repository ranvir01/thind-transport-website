/**
 * Lane intelligence (E1 backhaul hints): aggregate load history per
 * origin→destination market. Recomputed nightly (cron) and on demand —
 * the table is a cache, the loads are the truth.
 */
import { query } from "./db"
import { getCarrierSettings } from "./settings"
import type { Lane } from "./types"

export type LaneAggregateRow = {
  origin_city: string; origin_state: string; dest_city: string; dest_state: string
  loads_count: number; revenue_cents: number; miles: number
  /** Empty miles run on this lane — costed in margin_cents AND reported. */
  deadhead_miles: number
  /**
   * Loads on this lane that left `deadhead_miles` blank. SUM() coalesces a
   * blank to 0, so without this count a lane nobody filled in reports a
   * flawless 0 empty miles and an un-costed (too good) margin.
   */
  deadhead_missing_loads: number
  margin_cents: number
  last_used_at: string
}

type RawLaneAggregateRow = {
  origin_city: string; origin_state: string; dest_city: string; dest_state: string
  loads_count: string; revenue_cents: string; miles: string; deadhead_miles: string
  deadhead_missing_loads: string; margin_cents: string; last_used_at: string
}

/**
 * Shared lane aggregation: revenue (linehaul + FSC + accessorials), loaded and
 * deadhead miles, and margin grouped by origin→destination market.
 * `recomputeLanes` (all-time cache, below) and the Reports lane leaderboard
 * (`laneLeaderboardRange` in reports.ts) both read this — same formula,
 * different date scope — so the SQL lives in one place instead of two.
 *
 * Margin costs (loaded + deadhead) miles, not loaded miles alone: an empty
 * mile burns the same fuel and the same hour of the driver's clock as a loaded
 * one. Costing only loaded miles made the tool meant to kill deadhead blind to
 * it, and overstated margin by the whole deadhead bill (~26% on the demo book).
 * Deadhead is also returned per lane so the number is visible, not just netted
 * out of a total nobody can decompose — together with the count of loads that
 * left the field blank, because a blank is an unknown and rendering it as a
 * clean 0 is the same flattering lie the per-truck P&L already refuses to tell.
 */
export async function aggregateLanes(
  carrierId: string,
  costPerMileCents: number,
  dateFilterSql = "",
  dateFilterParams: unknown[] = []
): Promise<LaneAggregateRow[]> {
  const costParamIndex = dateFilterParams.length + 2
  const rows = await query<RawLaneAggregateRow>(
    `SELECT
       fs.city AS origin_city, fs.state AS origin_state,
       ls.city AS dest_city, ls.state AS dest_state,
       COUNT(*)::int AS loads_count,
       SUM(l.linehaul_cents + l.fuel_surcharge_cents +
           COALESCE((SELECT SUM((a->>'amount_cents')::bigint) FROM jsonb_array_elements(l.accessorials) a), 0)
       ) AS revenue_cents,
       SUM(COALESCE(l.loaded_miles, 0)) AS miles,
       SUM(COALESCE(l.deadhead_miles, 0)) AS deadhead_miles,
       COUNT(*) FILTER (WHERE l.deadhead_miles IS NULL)::int AS deadhead_missing_loads,
       SUM(l.linehaul_cents + l.fuel_surcharge_cents +
           COALESCE((SELECT SUM((a->>'amount_cents')::bigint) FROM jsonb_array_elements(l.accessorials) a), 0)
       ) - (SUM(COALESCE(l.loaded_miles, 0)) + SUM(COALESCE(l.deadhead_miles, 0))) * $${costParamIndex}::int AS margin_cents,
       MAX(l.created_at) AS last_used_at
     FROM hub.loads l
     JOIN LATERAL (SELECT city, state FROM hub.stops WHERE load_id = l.id AND type = 'pickup' ORDER BY sequence LIMIT 1) fs ON TRUE
     JOIN LATERAL (SELECT city, state FROM hub.stops WHERE load_id = l.id AND type = 'delivery' ORDER BY sequence DESC LIMIT 1) ls ON TRUE
     WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled' ${dateFilterSql}
     GROUP BY fs.city, fs.state, ls.city, ls.state`,
    [carrierId, ...dateFilterParams, costPerMileCents]
  )
  return rows.map((r) => ({
    origin_city: r.origin_city, origin_state: r.origin_state,
    dest_city: r.dest_city, dest_state: r.dest_state,
    loads_count: Number(r.loads_count), revenue_cents: Number(r.revenue_cents),
    miles: Number(r.miles), deadhead_miles: Number(r.deadhead_miles),
    deadhead_missing_loads: Number(r.deadhead_missing_loads ?? 0),
    margin_cents: Number(r.margin_cents),
    last_used_at: r.last_used_at,
  }))
}

/** Revenue per loaded mile, in cents — null when there are no loaded miles. */
export function avgRpmCents(revenueCents: number, miles: number): number | null {
  return miles > 0 ? Math.round(revenueCents / miles) : null
}

/** Rebuild a carrier's lane aggregates from settled/active load history. */
export async function recomputeLanes(carrierId: string): Promise<{ lanes: number }> {
  const settings = await getCarrierSettings(carrierId)
  // No `?? 185` fallback: getCarrierSettings merges over DEFAULT_SETTINGS, so
  // this is always a number, and a second literal here would quietly
  // reintroduce the old under-stated constant if it ever did fire.
  const costPerMileCents = settings.costPerMileCents
  const rows = await aggregateLanes(carrierId, costPerMileCents)

  await query(`DELETE FROM hub.lanes WHERE carrier_id = $1`, [carrierId])
  // hub.lanes has no deadhead column, so the cache stores loaded miles only —
  // margin_cents already has the deadhead cost netted out of it. Anything that
  // needs the deadhead figure itself reads it live from aggregateLanes (the
  // Reports leaderboard does); persisting it needs a migration.
  for (const lane of rows) {
    const avgRpm = avgRpmCents(lane.revenue_cents, lane.miles)
    await query(
      `INSERT INTO hub.lanes (carrier_id, origin_city, origin_state, dest_city, dest_state,
         loads_count, revenue_cents, miles, margin_cents, avg_rpm_cents, last_used_at, computed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT (carrier_id, origin_city, origin_state, dest_city, dest_state) DO UPDATE SET
         loads_count = EXCLUDED.loads_count, revenue_cents = EXCLUDED.revenue_cents,
         miles = EXCLUDED.miles, margin_cents = EXCLUDED.margin_cents,
         avg_rpm_cents = EXCLUDED.avg_rpm_cents, last_used_at = EXCLUDED.last_used_at,
         computed_at = NOW()`,
      [
        carrierId, lane.origin_city, lane.origin_state, lane.dest_city, lane.dest_state,
        lane.loads_count, lane.revenue_cents, lane.miles, lane.margin_cents, avgRpm, lane.last_used_at,
      ]
    )
  }
  return { lanes: rows.length }
}

/**
 * Backhaul hints: when a truck goes empty in a market, this carrier's
 * historical lanes OUT of that state ranked by margin PER MILE (E1).
 *
 * Per mile, not total: ranking by total margin recommended long cheap lanes
 * over short rich ones, which is backwards for a truck deciding what to book
 * next — the scarce resource is the mile, not the load. Denominator is loaded
 * miles (what hub.lanes stores); margin_cents already nets out deadhead cost.
 * Lanes with no recorded miles can't be ranked per mile, so they sort last on
 * total margin rather than jumping the queue on a null.
 */
export async function lanesOutOf(
  carrierId: string,
  state: string,
  limit = 5
): Promise<Lane[]> {
  return query<Lane>(
    `SELECT * FROM hub.lanes
     WHERE carrier_id = $1 AND origin_state = $2
     ORDER BY margin_cents::numeric / NULLIF(miles, 0) DESC NULLS LAST,
              margin_cents DESC, loads_count DESC
     LIMIT $3`,
    [carrierId, state, limit]
  )
}
