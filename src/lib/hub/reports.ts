/**
 * Owner dashboard (M10) data — revenue trend series. Booked-revenue definition
 * matches `getDashboardStats`/`truckPnl` (linehaul + FSC, non-cancelled loads).
 */
import { query } from "./db"

export interface RevenuePeriod {
  periodStart: string
  revenueCents: number
}

async function revenueTrend(carrierId: string, unit: "week" | "month", periods: number): Promise<RevenuePeriod[]> {
  const rows = await query<{ period_start: string; revenue_cents: string }>(
    `SELECT
       gs.period_start::text AS period_start,
       COALESCE(SUM(l.linehaul_cents + l.fuel_surcharge_cents), 0) AS revenue_cents
     FROM generate_series(
       date_trunc($2, NOW()) - ($3::int - 1) * ('1 ' || $2)::interval,
       date_trunc($2, NOW()),
       ('1 ' || $2)::interval
     ) AS gs(period_start)
     LEFT JOIN hub.loads l
       ON l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled'
       AND date_trunc($2, l.created_at) = gs.period_start
     GROUP BY gs.period_start
     ORDER BY gs.period_start ASC`,
    [carrierId, unit, periods]
  )
  return rows.map((r) => ({ periodStart: r.period_start, revenueCents: Number(r.revenue_cents) }))
}

export const weeklyRevenueTrend = (carrierId: string, weeks = 8) => revenueTrend(carrierId, "week", weeks)
export const monthlyRevenueTrend = (carrierId: string, months = 6) => revenueTrend(carrierId, "month", months)
