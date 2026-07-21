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
  loads_count: number; revenue_cents: number; miles: number; margin_cents: number
  last_used_at: string
}

type RawLaneAggregateRow = {
  origin_city: string; origin_state: string; dest_city: string; dest_state: string
  loads_count: string; revenue_cents: string; miles: string; margin_cents: string; last_used_at: string
}

/**
 * Shared lane aggregation: revenue (linehaul + FSC + accessorials), miles,
 * and margin (revenue - loaded miles * cost/mile) grouped by
 * origin→destination market. `recomputeLanes` (all-time cache, below) and
 * the Reports lane leaderboard (`laneLeaderboardRange` in reports.ts) both
 * read this — same formula, different date scope — so the SQL lives in one
 * place instead of two.
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
       SUM(l.linehaul_cents + l.fuel_surcharge_cents +
           COALESCE((SELECT SUM((a->>'amount_cents')::bigint) FROM jsonb_array_elements(l.accessorials) a), 0)
       ) - SUM(COALESCE(l.loaded_miles, 0)) * $${costParamIndex}::int AS margin_cents,
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
    miles: Number(r.miles), margin_cents: Number(r.margin_cents),
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
  const costPerMileCents = settings.costPerMileCents ?? 185
  const rows = await aggregateLanes(carrierId, costPerMileCents)

  await query(`DELETE FROM hub.lanes WHERE carrier_id = $1`, [carrierId])
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
 * historical lanes OUT of that state ranked by margin (E1).
 */
export async function lanesOutOf(
  carrierId: string,
  state: string,
  limit = 5
): Promise<Lane[]> {
  return query<Lane>(
    `SELECT * FROM hub.lanes
     WHERE carrier_id = $1 AND origin_state = $2
     ORDER BY margin_cents DESC, loads_count DESC
     LIMIT $3`,
    [carrierId, state, limit]
  )
}
