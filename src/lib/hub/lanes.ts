/**
 * Lane intelligence (E1 backhaul hints): aggregate load history per
 * origin→destination market. Recomputed nightly (cron) and on demand —
 * the table is a cache, the loads are the truth.
 */
import { query } from "./db"
import { getCarrierSettings } from "./settings"
import type { Lane } from "./types"

/** Rebuild a carrier's lane aggregates from settled/active load history. */
export async function recomputeLanes(carrierId: string): Promise<{ lanes: number }> {
  const settings = await getCarrierSettings(carrierId)
  const costPerMileCents = settings.costPerMileCents ?? 185

  const rows = await query<{
    origin_city: string; origin_state: string; dest_city: string; dest_state: string
    loads_count: string; revenue_cents: string; miles: string; last_used_at: string
  }>(
    `SELECT
       fs.city AS origin_city, fs.state AS origin_state,
       ls.city AS dest_city, ls.state AS dest_state,
       COUNT(*)::int AS loads_count,
       SUM(l.linehaul_cents + l.fuel_surcharge_cents +
           COALESCE((SELECT SUM((a->>'amount_cents')::bigint) FROM jsonb_array_elements(l.accessorials) a), 0)
       ) AS revenue_cents,
       SUM(COALESCE(l.loaded_miles, 0)) AS miles,
       MAX(l.created_at) AS last_used_at
     FROM hub.loads l
     JOIN LATERAL (SELECT city, state FROM hub.stops WHERE load_id = l.id AND type = 'pickup' ORDER BY sequence LIMIT 1) fs ON TRUE
     JOIN LATERAL (SELECT city, state FROM hub.stops WHERE load_id = l.id AND type = 'delivery' ORDER BY sequence DESC LIMIT 1) ls ON TRUE
     WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled'
     GROUP BY fs.city, fs.state, ls.city, ls.state`,
    [carrierId]
  )

  await query(`DELETE FROM hub.lanes WHERE carrier_id = $1`, [carrierId])
  for (const lane of rows) {
    const revenue = Number(lane.revenue_cents)
    const miles = Number(lane.miles)
    const margin = revenue - miles * costPerMileCents
    const avgRpm = miles > 0 ? Math.round(revenue / miles) : null
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
        Number(lane.loads_count), revenue, miles, margin, avgRpm, lane.last_used_at,
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
