/**
 * Owner dashboard (M10) data — revenue trend series. Booked-revenue definition
 * matches `getDashboardStats`/`truckPnl` (linehaul + FSC, non-cancelled loads).
 */
import { query, queryOne } from "./db"
import { getCarrierSettings } from "./settings"
import { aggregateLanes, avgRpmCents, type LaneAggregateRow } from "./lanes"
import { toCsv } from "./csv"
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
           WHERE p.invoice_id = i.id AND p.carrier_id = $1 AND p.paid_on <= c.checkpoint::date
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
 * AR aging trend CSV — one row per week-end checkpoint, same bucket columns
 * the owner-dashboard bars chart. Weeks-only (not a [from, to] range like the
 * P&L/lanes exports) because arAgingTrend is a reconstructed trailing series
 * ending today, not a window a user picks a start/end for.
 */
export function arAgingTrendCsv(rows: AgingTrendPeriod[], weeks: number): { filename: string; csv: string } {
  return {
    filename: `ar-aging-trend_last-${weeks}-weeks.csv`,
    csv: toCsv(
      ["WeekOf", "Current", "1-30", "31-60", "61-90", "90+", "TotalOpen"],
      rows.map((r) => [
        r.periodStart,
        (r.currentCents / 100).toFixed(2),
        (r.bucket1_30Cents / 100).toFixed(2),
        (r.bucket31_60Cents / 100).toFixed(2),
        (r.bucket61_90Cents / 100).toFixed(2),
        (r.bucket90PlusCents / 100).toFixed(2),
        (r.totalOpenCents / 100).toFixed(2),
      ])
    ),
  }
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

/**
 * Driver pay over a date range — the cost bucket the per-truck P&L does not
 * carry, and roughly half of a small carrier's cost per mile. Feeds
 * `computeFleetKpis({ driverPayCents })` so the Reports margin is a real
 * margin instead of a margin-before-payroll.
 *
 * Earning lines only: reimbursements repay expenses already booked in
 * hub.expenses (counting them again would double-charge), and deductions
 * (advances, escrow, insurance) are recoveries of money already paid out, not
 * reductions in what the driver earned. Scoped by settlement `period_end`
 * inside the window — the pay periods that closed in it — matching how the
 * 1099 export scopes settlements by period_end. Drafts count: the work is
 * done and the money is owed.
 *
 * Returns null, NOT 0, when the carrier has no settlements in the range.
 * "We don't know what payroll cost" must never render as "payroll cost
 * nothing", which would paint a green full-cost margin on an unpaid book.
 */
export async function driverPayCentsForRange(carrierId: string, range: PnlRange): Promise<number | null> {
  const row = await queryOne<{ settlements: number; earnings_cents: string }>(
    `SELECT COUNT(DISTINCT s.id)::int AS settlements,
       COALESCE(SUM(sl.amount_cents) FILTER (WHERE sl.kind = 'earning'), 0) AS earnings_cents
     FROM hub.settlements s
     LEFT JOIN hub.settlement_lines sl ON sl.settlement_id = s.id
     WHERE s.carrier_id = $1 AND s.period_end BETWEEN $2::date AND $3::date`,
    [carrierId, range.from, range.to]
  )
  if (!row || Number(row.settlements) === 0) return null
  return Number(row.earnings_cents)
}

/**
 * `truckPnlRange` rows carry one extra field over `TruckPnl`: how many loads in
 * the window left `deadhead_miles` blank. SUM() skips NULLs, so without it a
 * truck whose loads never had the field filled in reports a flawless 0% of
 * deadhead — the one number the screen exists to make people uncomfortable about.
 */
export type TruckPnlRangeRow = TruckPnl & { deadhead_missing_loads: number }

export async function truckPnlRange(carrierId: string, range: PnlRange): Promise<TruckPnlRangeRow[]> {
  const rows = await query<TruckPnlRangeRow>(
    `SELECT t.id AS truck_id, t.unit_number,
       COALESCE((SELECT SUM(l.linehaul_cents + l.fuel_surcharge_cents) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= $2::date AND l.created_at < $3::date + 1), 0) AS revenue_cents,
       COALESCE((SELECT SUM(f.total_cents) FROM hub.fuel_transactions f
         WHERE f.truck_id = t.id AND f.carrier_id = t.carrier_id AND f.ts >= $2::date AND f.ts < $3::date + 1), 0) AS fuel_cents,
       COALESCE((SELECT SUM(m.cost_cents) FROM hub.maintenance_records m
         WHERE m.truck_id = t.id AND m.carrier_id = t.carrier_id AND m.done_on BETWEEN $2::date AND $3::date), 0) AS maintenance_cents,
       COALESCE((SELECT SUM(e.amount_cents) FROM hub.expenses e
         WHERE e.truck_id = t.id AND e.carrier_id = t.carrier_id AND e.category NOT IN ('fuel','maintenance')
           AND e.incurred_on BETWEEN $2::date AND $3::date), 0) AS other_expense_cents,
       COALESCE((SELECT SUM(x.amount_cents) FROM hub.toll_transactions x
         WHERE x.truck_id = t.id AND x.carrier_id = t.carrier_id
           AND x.ts >= $2::date AND x.ts < $3::date + 1), 0) AS toll_cents,
       (SELECT SUM(l.loaded_miles) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= $2::date AND l.created_at < $3::date + 1) AS loaded_miles,
       (SELECT SUM(l.deadhead_miles) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= $2::date AND l.created_at < $3::date + 1) AS deadhead_miles,
       (SELECT COUNT(*)::int FROM hub.loads l
         WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= $2::date AND l.created_at < $3::date + 1
           AND l.deadhead_miles IS NULL) AS deadhead_missing_loads,
       0 AS net_cents
     FROM hub.trucks t
     WHERE t.carrier_id = $1 AND t.deleted_at IS NULL
     ORDER BY t.unit_number`,
    [carrierId, range.from, range.to]
  )
  return rows.map((row) => ({
    ...row,
    deadhead_missing_loads: Number(row.deadhead_missing_loads ?? 0),
    net_cents:
      Number(row.revenue_cents) - Number(row.fuel_cents) -
      Number(row.maintenance_cents) - Number(row.other_expense_cents) - Number(row.toll_cents),
  }))
}

// Same columns as the trailing-365-day "pnl" export in expenses.ts, so a
// spreadsheet built against one keeps working against the other.
export function truckPnlRangeCsv(rows: TruckPnl[], range: PnlRange): { filename: string; csv: string } {
  const headers = ["Truck", "Revenue", "Fuel", "Maintenance", "Tolls", "OtherExpenses", "Net", "LoadedMiles", "NetPerMile"]
  const body = rows.map((r) => [
    r.unit_number,
    (Number(r.revenue_cents) / 100).toFixed(2),
    (Number(r.fuel_cents) / 100).toFixed(2),
    (Number(r.maintenance_cents) / 100).toFixed(2),
    (Number(r.toll_cents) / 100).toFixed(2),
    (Number(r.other_expense_cents) / 100).toFixed(2),
    (r.net_cents / 100).toFixed(2),
    r.loaded_miles ?? 0,
    r.loaded_miles ? (r.net_cents / 100 / Number(r.loaded_miles)).toFixed(2) : "",
  ])
  return {
    filename: `per-truck-pnl_${range.from}_${range.to}.csv`,
    csv: toCsv(headers, body),
  }
}

/**
 * Lane leaderboard (M10) — top lanes by margin over a date range, computed
 * live from load history via the same aggregation `recomputeLanes` uses
 * (lanes.ts's `aggregateLanes`). Live rather than reading `hub.lanes` because
 * that table is an all-time cache rebuilt nightly: it can't be date-scoped
 * and is empty until the first recompute runs.
 */
export interface LaneLeaderboardRow {
  origin_city: string
  origin_state: string
  dest_city: string
  dest_state: string
  loads_count: number
  /** Loaded miles. */
  miles: number
  /** Empty miles — costed inside margin_cents, and shown so the lane can be judged on it. */
  deadhead_miles: number
  /** Loads on the lane with a blank deadhead field: the miles above are a floor, not a fact. */
  deadhead_missing_loads: number
  revenue_cents: number
  /** Revenue - (loaded + deadhead) miles * cost/mile. Deadhead IS charged here. */
  margin_cents: number
  avg_rpm_cents: number | null
}

function toLeaderboardRows(rows: LaneAggregateRow[], limit: number): LaneLeaderboardRow[] {
  return rows
    .slice()
    .sort((a, b) => b.margin_cents - a.margin_cents || b.loads_count - a.loads_count)
    .slice(0, limit)
    .map((r) => ({
      origin_city: r.origin_city,
      origin_state: r.origin_state,
      dest_city: r.dest_city,
      dest_state: r.dest_state,
      loads_count: r.loads_count,
      revenue_cents: r.revenue_cents,
      miles: r.miles,
      deadhead_miles: r.deadhead_miles,
      deadhead_missing_loads: r.deadhead_missing_loads,
      margin_cents: r.margin_cents,
      avg_rpm_cents: avgRpmCents(r.revenue_cents, r.miles),
    }))
}

/**
 * Lane leaderboard scoped to an explicit [from, to] window, for the Reports
 * page and its CSV export and the owner dashboard (mirrors truckPnl vs
 * truckPnlRange above). Live rather than `hub.lanes`, which is an all-time
 * cache that can't be date-scoped.
 */
export async function laneLeaderboardRange(carrierId: string, range: PnlRange, limit = 20): Promise<LaneLeaderboardRow[]> {
  const settings = await getCarrierSettings(carrierId)
  // No `?? 185` fallback: getCarrierSettings merges over DEFAULT_SETTINGS, so
  // this is always a number, and a second literal here would quietly
  // reintroduce the old under-stated constant if it ever did fire.
  const costPerMileCents = settings.costPerMileCents
  const rows = await aggregateLanes(
    carrierId, costPerMileCents,
    "AND l.created_at >= $2::date AND l.created_at < $3::date + 1", [range.from, range.to]
  )
  return toLeaderboardRows(rows, limit)
}

// Same columns as the all-time "lanes" export in expenses.ts, so a
// spreadsheet built against one keeps working against the other. EstMargin now
// charges deadhead miles in BOTH exports (that one reads hub.lanes, which
// recomputeLanes rebuilds with the same formula). A Deadhead column is
// deliberately absent from both: hub.lanes has no deadhead column to serve the
// all-time export from, and splitting the two column sets is worse than
// leaving the figure to the on-screen leaderboard.
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
    csv: toCsv(headers, body),
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

/**
 * Fuel-spend CSV export — per-truck monthly totals for the last 6 months
 * (current month included). Detail view behind the owner-dashboard fuel
 * panel, same whole-pump-bill definition as fuelSpendSummary above.
 */
export async function exportFuelSpendCsv(carrierId: string): Promise<{ filename: string; csv: string }> {
  const rows = await query<Record<string, unknown>>(
    `SELECT to_char(date_trunc('month', f.ts), 'YYYY-MM') AS month,
       COALESCE(t.unit_number, 'Unassigned') AS truck,
       ROUND(SUM(f.gallons)::numeric, 1) AS gallons,
       ROUND(SUM(f.total_cents) / 100.0, 2) AS total_spend,
       ROUND(SUM(f.total_cents) / 100.0 / NULLIF(SUM(f.gallons), 0), 2) AS avg_per_gal
     FROM hub.fuel_transactions f
     LEFT JOIN hub.trucks t ON t.id = f.truck_id AND t.carrier_id = f.carrier_id
     WHERE f.carrier_id = $1 AND f.ts >= date_trunc('month', NOW()) - interval '5 months'
     GROUP BY 1, 2
     ORDER BY 1 DESC, SUM(f.total_cents) DESC`,
    [carrierId]
  )
  return {
    filename: "fuel-spend.csv",
    csv: toCsv(
      ["Month", "Truck", "Gallons", "TotalSpend", "AvgPerGal"],
      rows.map((r) => [r.month, r.truck, r.gallons, r.total_spend, r.avg_per_gal])
    ),
  }
}
