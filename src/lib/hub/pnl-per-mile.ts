/**
 * Per-mile view of a P&L row — the three numbers a dispatcher actually argues
 * about: what a mile earns, what a mile costs, and the gap. Pure arithmetic
 * over a row that already exists (truckPnlRange / driverPnlRange); the
 * fleet-level version lives in kpi.ts and stays the source for the fleet card.
 *
 * Null when there are no miles: a truck that sat in the yard has no rate per
 * mile, and dividing by zero into "∞ RPM" would be the kind of number that
 * looks like a win.
 */

export interface PerMileInput {
  revenue_cents: string | number
  loaded_miles: string | number | null
  deadhead_miles: string | number | null
  /** Operating cost components. Absent ones count as zero (a driver row has none). */
  fuel_cents?: string | number
  maintenance_cents?: string | number
  toll_cents?: string | number
  other_expense_cents?: string | number
  /** Driver pay when it is attributable to this row (driver rows). Null = unknown, never 0. */
  pay_cents?: string | number | null
}

export interface PerMile {
  loadedMiles: number
  totalMiles: number
  /** Revenue per LOADED mile — the rate the market paid. */
  rpmCents: number | null
  /** Operating cost per TOTAL mile — deadhead costs fuel too. */
  operatingCpmCents: number
  /** Pay per total mile, null when pay is unknown for the row. */
  payCpmCents: number | null
  /** RPM-basis margin: revenue − operating (− pay when known), per total mile. */
  marginPerMileCents: number | null
}

const n = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v) || 0)

export function perMile(row: PerMileInput): PerMile | null {
  const loadedMiles = Math.max(0, n(row.loaded_miles))
  const totalMiles = loadedMiles + Math.max(0, n(row.deadhead_miles))
  if (totalMiles <= 0) return null

  const revenue = n(row.revenue_cents)
  const operating = n(row.fuel_cents) + n(row.maintenance_cents) + n(row.toll_cents) + n(row.other_expense_cents)
  const payKnown = row.pay_cents != null
  const pay = payKnown ? n(row.pay_cents) : 0

  return {
    loadedMiles,
    totalMiles,
    rpmCents: loadedMiles > 0 ? Math.round(revenue / loadedMiles) : null,
    operatingCpmCents: Math.round(operating / totalMiles),
    payCpmCents: payKnown ? Math.round(pay / totalMiles) : null,
    marginPerMileCents: Math.round((revenue - operating - pay) / totalMiles),
  }
}

/** "$2.14" from cents-per-mile, for tables and CSVs. */
export function fmtPerMile(cents: number | null): string {
  return cents == null ? "—" : `$${(cents / 100).toFixed(2)}`
}
