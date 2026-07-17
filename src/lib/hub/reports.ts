/**
 * Owner dashboard (M10) data — revenue trend series. Booked-revenue definition
 * matches `getDashboardStats`/`truckPnl` (linehaul + FSC, non-cancelled loads).
 */
import { query, queryOne } from "./db"
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

export type PnlRangePreset = "mtd" | "last-quarter" | "ytd"

/**
 * Calendar presets for the Reports range form. UTC day math to match
 * `resolvePnlRange` (both slice `toISOString`); "last-quarter" is the most
 * recent COMPLETED calendar quarter, so its numbers stop moving once the
 * quarter closes.
 */
export function presetPnlRange(preset: PnlRangePreset, today = new Date()): PnlRange {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()
  switch (preset) {
    case "mtd":
      return { from: iso(new Date(Date.UTC(y, m, 1))), to: iso(today) }
    case "last-quarter": {
      const startMonth = Math.floor(m / 3) * 3 - 3
      return {
        from: iso(new Date(Date.UTC(y, startMonth, 1))),
        to: iso(new Date(Date.UTC(y, startMonth + 3, 0))),
      }
    }
    case "ytd":
      return { from: iso(new Date(Date.UTC(y, 0, 1))), to: iso(today) }
  }
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
