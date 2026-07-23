/**
 * Owner dashboard (M10) data — revenue trend series. Booked-revenue definition
 * matches `getDashboardStats`/`truckPnl` (linehaul + FSC, non-cancelled loads).
 */
import { query, queryOne } from "./db"
import { getCarrierSettings } from "./settings"
import type { TruckPnl } from "./expenses"

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

/**
 * AR aging trend — what the aging buckets would have shown at each past week-end,
 * reconstructed from invoice/payment history rather than a live snapshot. Bucket
 * math (days past due) mirrors `agingBucket` in `./money.ts`.
 */
export interface AgingTrendPeriod {
  periodStart: string
  currentCents: number
  bucket1_30Cents: number
  bucket31_60Cents: number
  bucket61_90Cents: number
  bucket90PlusCents: number
  totalOpenCents: number
}

export async function arAgingTrend(carrierId: string, weeks = 8): Promise<AgingTrendPeriod[]> {
  const rows = await query<{
    period_start: string
    current_cents: string
    b1_30_cents: string
    b31_60_cents: string
    b61_90_cents: string
    b90_plus_cents: string
  }>(
    `WITH checkpoints AS (
       SELECT gs AS checkpoint
       FROM generate_series(
         date_trunc('week', NOW()) - ($2::int - 1) * interval '1 week',
         date_trunc('week', NOW()),
         interval '1 week'
       ) AS gs
     ),
     open_snapshots AS (
       SELECT
         c.checkpoint,
         (c.checkpoint::date - i.due_on) AS days_past,
         i.amount_cents - COALESCE((
           SELECT SUM(p.amount_cents) FROM hub.payments p
           WHERE p.invoice_id = i.id AND p.paid_on <= c.checkpoint::date
         ), 0) AS open_cents
       FROM checkpoints c
       LEFT JOIN hub.invoices i
         ON i.carrier_id = $1 AND i.issued_on <= c.checkpoint::date
     )
     SELECT
       checkpoint::text AS period_start,
       COALESCE(SUM(open_cents) FILTER (WHERE open_cents > 0 AND days_past <= 0), 0) AS current_cents,
       COALESCE(SUM(open_cents) FILTER (WHERE open_cents > 0 AND days_past BETWEEN 1 AND 30), 0) AS b1_30_cents,
       COALESCE(SUM(open_cents) FILTER (WHERE open_cents > 0 AND days_past BETWEEN 31 AND 60), 0) AS b31_60_cents,
       COALESCE(SUM(open_cents) FILTER (WHERE open_cents > 0 AND days_past BETWEEN 61 AND 90), 0) AS b61_90_cents,
       COALESCE(SUM(open_cents) FILTER (WHERE open_cents > 0 AND days_past > 90), 0) AS b90_plus_cents
     FROM open_snapshots
     GROUP BY checkpoint
     ORDER BY checkpoint ASC`,
    [carrierId, weeks]
  )
  return rows.map((r) => {
    const currentCents = Number(r.current_cents)
    const bucket1_30Cents = Number(r.b1_30_cents)
    const bucket31_60Cents = Number(r.b31_60_cents)
    const bucket61_90Cents = Number(r.b61_90_cents)
    const bucket90PlusCents = Number(r.b90_plus_cents)
    return {
      periodStart: r.period_start,
      currentCents,
      bucket1_30Cents,
      bucket31_60Cents,
      bucket61_90Cents,
      bucket90PlusCents,
      totalOpenCents: currentCents + bucket1_30Cents + bucket31_60Cents + bucket61_90Cents + bucket90PlusCents,
    }
  })
}

/**
 * Driver settlement liability (M10) — money owed to drivers not yet paid out:
 * draft settlements (not yet approved) plus approved-but-unpaid settlements.
 */
export interface SettlementLiability {
  draftCents: number
  approvedCents: number
  totalCents: number
}

export async function settlementLiability(carrierId: string): Promise<SettlementLiability> {
  const row = await queryOne<{ draft_cents: string; approved_cents: string }>(
    `SELECT
       COALESCE(SUM(net_cents) FILTER (WHERE status = 'draft'), 0) AS draft_cents,
       COALESCE(SUM(net_cents) FILTER (WHERE status = 'approved'), 0) AS approved_cents
     FROM hub.settlements
     WHERE carrier_id = $1 AND status IN ('draft', 'approved')`,
    [carrierId]
  )
  const draftCents = Number(row?.draft_cents ?? 0)
  const approvedCents = Number(row?.approved_cents ?? 0)
  return { draftCents, approvedCents, totalCents: draftCents + approvedCents }
}

/**
 * Fuel spend (M10) — week-to-date / month-to-date pump spend, with the
 * month's biggest-spending trucks. Every gallon counts toward spend (unlike
 * MPG, which excludes reefer/DEF — see fuel-core.ts); an owner watching cash
 * out the door wants the whole pump bill, not just propulsion fuel.
 */
export interface FuelSpendTruck {
  truck_id: string | null
  truck_unit: string | null
  total_cents: number
  gallons: number
}

export interface FuelSpendSummary {
  weekCents: number
  monthCents: number
  monthGallons: number
  avgPriceCents: number | null
  topTrucks: FuelSpendTruck[]
}

/**
 * Date-range per-truck P&L (M10 "date-range reports exportable to CSV").
 * Same row shape, revenue definition, and expense buckets as `truckPnl`
 * (expenses.ts), but over an explicit inclusive [from, to] day window
 * instead of a trailing-days one.
 */
export interface PnlRange {
  from: string // YYYY-MM-DD, inclusive
  to: string // YYYY-MM-DD, inclusive
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Round-trip through Date because V8 rolls impossible days over ("2026-02-31"
// parses as Mar 3) — Postgres would reject the original string with a 500.
const isValidIsoDate = (value: string | null | undefined): value is string => {
  if (!value || !ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Resolve untrusted ?from/?to params to a usable range: malformed or missing
 * ends fall back to the trailing 92 days ending today (matching the page's
 * historical default), and a backwards range is swapped rather than erroring.
 */
export function resolvePnlRange(fromParam?: string | null, toParam?: string | null): PnlRange {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const now = Date.now()
  let to = isValidIsoDate(toParam) ? toParam : iso(new Date(now))
  let from = isValidIsoDate(fromParam) ? fromParam : iso(new Date(now - 92 * 86_400_000))
  if (from > to) [from, to] = [to, from]
  return { from, to }
}

/**
 * Preset windows for the Reports range form. Day math is UTC to match
 * resolvePnlRange. "Last month" / "Last quarter" are the most recent
 * COMPLETE calendar month/quarter (in Q3 that's Apr–Jun) — the partial
 * current period is already covered by MTD, and owners compare against
 * closed books.
 */
export interface PnlPreset {
  key: "mtd" | "last-month" | "last-quarter" | "ytd"
  label: string
  range: PnlRange
}

export function pnlPresetRanges(today = new Date()): PnlPreset[] {
  // Date.UTC rolls out-of-range months (-3 → Oct prior year) and day 0
  // (→ last day of the prior month), which is exactly the month/quarter math.
  const iso = (y: number, monthIndex: number, day: number) =>
    new Date(Date.UTC(y, monthIndex, day)).toISOString().slice(0, 10)
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()
  const todayIso = iso(y, m, today.getUTCDate())
  const prevQuarterStart = Math.floor(m / 3) * 3 - 3
  return [
    { key: "mtd", label: "MTD", range: { from: iso(y, m, 1), to: todayIso } },
    { key: "last-month", label: "Last month", range: { from: iso(y, m - 1, 1), to: iso(y, m, 0) } },
    {
      key: "last-quarter",
      label: "Last quarter",
      range: { from: iso(y, prevQuarterStart, 1), to: iso(y, prevQuarterStart + 3, 0) },
    },
    { key: "ytd", label: "YTD", range: { from: iso(y, 0, 1), to: todayIso } },
  ]
}

/**
 * Last-used Reports range, persisted so the page reopens where the owner
 * left off. A cookie (per browser) rather than a DB column: per-user server
 * storage needs a migration, which is integrator territory.
 */
export const REPORTS_RANGE_COOKIE = "hub_reports_range"

/** Parse the persisted "YYYY-MM-DD_YYYY-MM-DD" cookie; null on anything malformed or tampered. */
export function parseStoredPnlRange(value: string | null | undefined): PnlRange | null {
  if (!value) return null
  const [from, to, ...rest] = value.split("_")
  if (rest.length > 0 || !isValidIsoDate(from) || !isValidIsoDate(to)) return null
  return from > to ? { from: to, to: from } : { from, to }
}

export async function truckPnlRange(carrierId: string, range: PnlRange): Promise<TruckPnl[]> {
  const rows = await query<TruckPnl>(
    `SELECT t.id AS truck_id, t.unit_number,
       COALESCE((SELECT SUM(l.linehaul_cents + l.fuel_surcharge_cents) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= $2::date AND l.created_at < $3::date + 1), 0) AS revenue_cents,
       COALESCE((SELECT SUM(f.total_cents) FROM hub.fuel_transactions f
         WHERE f.truck_id = t.id AND f.ts >= $2::date AND f.ts < $3::date + 1), 0) AS fuel_cents,
       COALESCE((SELECT SUM(m.cost_cents) FROM hub.maintenance_records m
         WHERE m.truck_id = t.id AND m.done_on BETWEEN $2::date AND $3::date), 0) AS maintenance_cents,
       COALESCE((SELECT SUM(e.amount_cents) FROM hub.expenses e
         WHERE e.truck_id = t.id AND e.category NOT IN ('fuel','maintenance')
           AND e.incurred_on BETWEEN $2::date AND $3::date), 0) AS other_expense_cents,
       (SELECT SUM(l.loaded_miles) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= $2::date AND l.created_at < $3::date + 1) AS loaded_miles,
       (SELECT SUM(l.deadhead_miles) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= $2::date AND l.created_at < $3::date + 1) AS deadhead_miles,
       0 AS net_cents
     FROM hub.trucks t
     WHERE t.carrier_id = $1 AND t.deleted_at IS NULL
     ORDER BY t.unit_number`,
    [carrierId, range.from, range.to]
  )
  return rows.map((row) => ({
    ...row,
    net_cents:
      Number(row.revenue_cents) - Number(row.fuel_cents) -
      Number(row.maintenance_cents) - Number(row.other_expense_cents),
  }))
}

// Same columns as the trailing-365-day "pnl" export in expenses.ts, so a
// spreadsheet built against one keeps working against the other. csvField
// duplicates the private csvEscape there — lifting both to a shared csv
// module is an integrator-level move (see commit backlog).
const csvField = (value: unknown): string => {
  const str = String(value ?? "")
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function truckPnlRangeCsv(rows: TruckPnl[], range: PnlRange): { filename: string; csv: string } {
  const headers = ["Truck", "Revenue", "Fuel", "Maintenance", "OtherExpenses", "Net", "LoadedMiles", "NetPerMile"]
  const body = rows.map((r) => [
    r.unit_number,
    (Number(r.revenue_cents) / 100).toFixed(2),
    (Number(r.fuel_cents) / 100).toFixed(2),
    (Number(r.maintenance_cents) / 100).toFixed(2),
    (Number(r.other_expense_cents) / 100).toFixed(2),
    (r.net_cents / 100).toFixed(2),
    r.loaded_miles ?? 0,
    r.loaded_miles ? (r.net_cents / 100 / Number(r.loaded_miles)).toFixed(2) : "",
  ])
  return {
    filename: `per-truck-pnl_${range.from}_${range.to}.csv`,
    csv: [headers.join(","), ...body.map((row) => row.map(csvField).join(","))].join("\n"),
  }
}

/**
 * Lane leaderboard (M10) — top lanes by margin over a trailing-days window,
 * computed live from load history with the same aggregation and revenue
 * definition (linehaul + FSC + accessorials) as `recomputeLanes` (lanes.ts).
 * Live rather than reading `hub.lanes` because that table is an all-time
 * cache rebuilt nightly: it can't be date-scoped and is empty until the
 * first recompute runs.
 */
export interface LaneLeaderboardRow {
  origin_city: string
  origin_state: string
  dest_city: string
  dest_state: string
  loads_count: number
  revenue_cents: number
  miles: number
  margin_cents: number
  avg_rpm_cents: number | null
}

type LaneLeaderboardQueryRow = {
  origin_city: string; origin_state: string; dest_city: string; dest_state: string
  loads_count: number; revenue_cents: string; miles: string; margin_cents: string
}

function mapLaneLeaderboardRows(rows: LaneLeaderboardQueryRow[]): LaneLeaderboardRow[] {
  return rows.map((r) => {
    const revenue = Number(r.revenue_cents)
    const miles = Number(r.miles)
    return {
      origin_city: r.origin_city,
      origin_state: r.origin_state,
      dest_city: r.dest_city,
      dest_state: r.dest_state,
      loads_count: Number(r.loads_count),
      revenue_cents: revenue,
      miles,
      margin_cents: Number(r.margin_cents),
      avg_rpm_cents: miles > 0 ? Math.round(revenue / miles) : null,
    }
  })
}

/**
 * Lane leaderboard scoped to an explicit [from, to] window, for the owner
 * dashboard, Reports page, and its CSV export (mirrors truckPnl vs
 * truckPnlRange above). Live rather than `hub.lanes`, which is an all-time
 * cache that can't be date-scoped.
 */
export async function laneLeaderboardRange(carrierId: string, range: PnlRange, limit = 20): Promise<LaneLeaderboardRow[]> {
  const settings = await getCarrierSettings(carrierId)
  const costPerMileCents = settings.costPerMileCents ?? 185

  const rows = await query<LaneLeaderboardQueryRow>(
    `SELECT * FROM (
       SELECT
         fs.city AS origin_city, fs.state AS origin_state,
         ls.city AS dest_city, ls.state AS dest_state,
         COUNT(*)::int AS loads_count,
         SUM(l.linehaul_cents + l.fuel_surcharge_cents +
             COALESCE((SELECT SUM((a->>'amount_cents')::bigint) FROM jsonb_array_elements(l.accessorials) a), 0)
         ) AS revenue_cents,
         SUM(COALESCE(l.loaded_miles, 0)) AS miles,
         SUM(l.linehaul_cents + l.fuel_surcharge_cents +
             COALESCE((SELECT SUM((a->>'amount_cents')::bigint) FROM jsonb_array_elements(l.accessorials) a), 0)
         ) - SUM(COALESCE(l.loaded_miles, 0)) * $4::int AS margin_cents
       FROM hub.loads l
       JOIN LATERAL (SELECT city, state FROM hub.stops WHERE load_id = l.id AND type = 'pickup' ORDER BY sequence LIMIT 1) fs ON TRUE
       JOIN LATERAL (SELECT city, state FROM hub.stops WHERE load_id = l.id AND type = 'delivery' ORDER BY sequence DESC LIMIT 1) ls ON TRUE
       WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled'
         AND l.created_at >= $2::date AND l.created_at < $3::date + 1
       GROUP BY fs.city, fs.state, ls.city, ls.state
     ) lane
     ORDER BY margin_cents DESC, loads_count DESC
     LIMIT $5`,
    [carrierId, range.from, range.to, costPerMileCents, limit]
  )
  return mapLaneLeaderboardRows(rows)
}

// Same columns as the all-time "lanes" export in expenses.ts, so a
// spreadsheet built against one keeps working against the other.
export function laneLeaderboardRangeCsv(rows: LaneLeaderboardRow[], range: PnlRange): { filename: string; csv: string } {
  const headers = ["Origin", "OriginState", "Destination", "DestState", "Loads", "Revenue", "Miles", "EstMargin", "AvgRPM"]
  const body = rows.map((r) => [
    r.origin_city,
    r.origin_state,
    r.dest_city,
    r.dest_state,
    r.loads_count,
    (r.revenue_cents / 100).toFixed(2),
    r.miles,
    (r.margin_cents / 100).toFixed(2),
    r.avg_rpm_cents != null ? (r.avg_rpm_cents / 100).toFixed(2) : "",
  ])
  return {
    filename: `lanes_${range.from}_${range.to}.csv`,
    csv: [headers.join(","), ...body.map((row) => row.map(csvField).join(","))].join("\n"),
  }
}

export async function fuelSpendSummary(carrierId: string): Promise<FuelSpendSummary> {
  const totals = await queryOne<{ week_cents: string; month_cents: string; month_gallons: string }>(
    `SELECT
       COALESCE(SUM(total_cents) FILTER (WHERE ts >= date_trunc('week', NOW())), 0) AS week_cents,
       COALESCE(SUM(total_cents) FILTER (WHERE ts >= date_trunc('month', NOW())), 0) AS month_cents,
       COALESCE(SUM(gallons) FILTER (WHERE ts >= date_trunc('month', NOW())), 0) AS month_gallons
     FROM hub.fuel_transactions
     WHERE carrier_id = $1`,
    [carrierId]
  )
  const topTrucks = await query<FuelSpendTruck>(
    `SELECT f.truck_id, t.unit_number AS truck_unit,
       SUM(f.total_cents)::int AS total_cents, SUM(f.gallons) AS gallons
     FROM hub.fuel_transactions f
     LEFT JOIN hub.trucks t ON t.id = f.truck_id AND t.carrier_id = f.carrier_id
     WHERE f.carrier_id = $1 AND f.ts >= date_trunc('month', NOW())
     GROUP BY f.truck_id, t.unit_number
     ORDER BY total_cents DESC LIMIT 5`,
    [carrierId]
  )
  const monthCents = Number(totals?.month_cents ?? 0)
  const monthGallons = Number(totals?.month_gallons ?? 0)
  return {
    weekCents: Number(totals?.week_cents ?? 0),
    monthCents,
    monthGallons,
    avgPriceCents: monthGallons > 0 ? Math.round(monthCents / monthGallons) : null,
    topTrucks: topTrucks.map((t) => ({ ...t, total_cents: Number(t.total_cents), gallons: Number(t.gallons) })),
  }
}
