/**
 * Pure IFTA quarterly tax computation — no DB, unit-tested to the penny
 * against a hand-computed golden fixture.
 *
 * Rules implemented:
 * - Fleet MPG = total miles ÷ total tax-paid gallons (4-decimal precision).
 * - Per jurisdiction: taxable gallons = miles ÷ MPG (full precision).
 * - Net tax = taxable gallons × rate − tax-paid gallons × rate, rounded
 *   half-away-from-zero to the cent per line.
 * - Surcharge jurisdictions (IN, KY, VA) add a surcharge line of
 *   taxable gallons × surcharge rate with NO tax-paid credit.
 */
import { roundHalfAwayFromZero } from "./money"
import type { IftaReportRow } from "./types"

export const SURCHARGE_JURISDICTIONS = ["IN", "KY", "VA"] as const

export interface IftaInputs {
  /** Miles traveled per jurisdiction (all IFTA miles are taxable here). */
  milesByJurisdiction: Record<string, number>
  /** Tax-paid gallons purchased per jurisdiction. */
  gallonsByJurisdiction: Record<string, number>
  /** Tax rates per jurisdiction ($/gallon, 4-decimal). */
  rates: Record<string, { rate: number; surchargeRate?: number }>
}

export interface IftaResult {
  fleetMiles: number
  fleetGallons: number
  mpg: number
  rows: IftaReportRow[]
  netTaxCents: number
  /** Jurisdictions traveled or fueled in with no rate on file (must be resolved before filing). */
  missingRates: string[]
}

export function computeIfta(inputs: IftaInputs): IftaResult {
  const jurisdictions = new Set<string>([
    ...Object.keys(inputs.milesByJurisdiction),
    ...Object.keys(inputs.gallonsByJurisdiction),
  ])

  const fleetMiles = Object.values(inputs.milesByJurisdiction).reduce((s, m) => s + m, 0)
  const fleetGallons = Object.values(inputs.gallonsByJurisdiction).reduce((s, g) => s + g, 0)
  const mpg = fleetGallons > 0 ? fleetMiles / fleetGallons : 0

  const rows: IftaReportRow[] = []
  const missingRates: string[] = []

  for (const jurisdiction of [...jurisdictions].sort()) {
    const miles = inputs.milesByJurisdiction[jurisdiction] ?? 0
    const taxPaidGallons = inputs.gallonsByJurisdiction[jurisdiction] ?? 0
    const rateEntry = inputs.rates[jurisdiction]
    if (!rateEntry) {
      // Purchases-only jurisdictions matter too: without a rate their tax-paid
      // credit silently computes to $0, understating the fleet's refund.
      if (miles > 0 || taxPaidGallons > 0) missingRates.push(jurisdiction)
      rows.push({
        jurisdiction, miles, taxPaidGallons,
        taxableGallons: mpg > 0 ? miles / mpg : 0,
        rate: 0, surchargeRate: 0, taxCents: 0, surchargeCents: 0, netCents: 0,
      })
      continue
    }

    const taxableGallons = mpg > 0 ? miles / mpg : 0
    const taxCents = roundHalfAwayFromZero((taxableGallons - taxPaidGallons) * rateEntry.rate * 100)
    const surchargeRate = rateEntry.surchargeRate ?? 0
    // Surcharge gets no credit for tax-paid purchases.
    const surchargeCents =
      surchargeRate > 0 ? roundHalfAwayFromZero(taxableGallons * surchargeRate * 100) : 0

    rows.push({
      jurisdiction,
      miles: Math.round(miles * 100) / 100,
      taxableGallons: Math.round(taxableGallons * 1000) / 1000,
      taxPaidGallons: Math.round(taxPaidGallons * 1000) / 1000,
      rate: rateEntry.rate,
      surchargeRate,
      taxCents,
      surchargeCents,
      netCents: taxCents + surchargeCents,
    })
  }

  return {
    fleetMiles: Math.round(fleetMiles * 100) / 100,
    fleetGallons: Math.round(fleetGallons * 1000) / 1000,
    mpg: Math.round(mpg * 10000) / 10000,
    rows,
    netTaxCents: rows.reduce((sum, row) => sum + row.netCents, 0),
    missingRates,
  }
}

/**
 * Jurisdictions whose rate on file no longer matches the rate a computed
 * report actually used — the report is stale and must be recomputed before
 * filing. Jurisdictions with no rate on file are the missingRates path's
 * problem, not staleness.
 */
export function staleRateJurisdictions(
  rows: Pick<IftaReportRow, "jurisdiction" | "rate" | "surchargeRate">[],
  rates: Record<string, { rate: number; surchargeRate?: number }>
): string[] {
  const stale: string[] = []
  for (const row of rows) {
    const onFile = rates[row.jurisdiction]
    if (!onFile) continue
    const rateChanged = Math.abs(onFile.rate - Number(row.rate)) > 1e-9
    const surchargeChanged =
      Math.abs((onFile.surchargeRate ?? 0) - Number(row.surchargeRate ?? 0)) > 1e-9
    if (rateChanged || surchargeChanged) stale.push(row.jurisdiction)
  }
  return stale
}

/**
 * Base fuel-tax cents for a row, split out from the surcharge — legacy
 * stored reports predate the taxCents/surchargeCents split, so fall back to
 * the combined net minus surcharge (surcharge itself defaults to 0 too).
 */
export function iftaRowFuelTaxCents(
  row: Partial<Pick<IftaReportRow, "taxCents" | "surchargeCents" | "netCents">>
): number {
  const surchargeCents = Number(row.surchargeCents ?? 0)
  return row.taxCents != null ? Number(row.taxCents) : Number(row.netCents ?? 0) - surchargeCents
}

export interface IftaWorksheetWarningInputs {
  status: "draft" | "reviewed" | "filed"
  rows: Pick<IftaReportRow, "jurisdiction" | "rate" | "surchargeRate">[]
  missingRates?: string[]
  unknownJurisdictionGallons?: number
  /** Rates currently on file for the quarter (numeric, like staleRateJurisdictions takes). */
  ratesOnFile: Record<string, { rate: number; surchargeRate?: number }>
}

/**
 * The worksheet screen's warning panels as plain sentences, for the PDF/CSV
 * exports — an office user transcribing from a download must see the same
 * caveats the screen shows. Same policy as the page: missing rates and
 * stateless gallons always warn; stale rates only nag unfiled reports
 * (a filed quarter is history).
 */
export function iftaWorksheetWarnings(input: IftaWorksheetWarningInputs): string[] {
  const warnings: string[] = []
  if ((input.missingRates?.length ?? 0) > 0) {
    warnings.push(
      `Missing rates for ${input.missingRates!.join(", ")} — these lines are priced at $0. Import rates and recompute before filing.`
    )
  }
  const stale = input.status !== "filed" ? staleRateJurisdictions(input.rows, input.ratesOnFile) : []
  if (stale.length > 0) {
    warnings.push(
      `Rates on file for ${stale.join(", ")} changed after this report was computed — the lines use the old rates. Recompute before filing.`
    )
  }
  if ((input.unknownJurisdictionGallons ?? 0) > 0) {
    warnings.push(
      `${input.unknownJurisdictionGallons!.toLocaleString("en-US")} gal of tractor fuel have no state and are excluded from tax-paid credit and fleet MPG — this overstates MPG and understates taxable gallons. Set each purchase's state in Fuel and recompute.`
    )
  }
  return warnings
}

/** "2026Q2"-style key for a date; IFTA quarters are calendar quarters. */
export function quarterKey(date: Date): string {
  return `${date.getUTCFullYear()}Q${Math.floor(date.getUTCMonth() / 3) + 1}`
}

/** Most recently completed quarter before `date` — the one a filing is actually due for. */
export function lastCompletedQuarterKey(date: Date): string {
  const q = Math.floor(date.getUTCMonth() / 3)
  return q === 0 ? `${date.getUTCFullYear() - 1}Q4` : `${date.getUTCFullYear()}Q${q}`
}

export function quarterRange(quarter: string): { start: Date; end: Date } {
  const match = quarter.match(/^(\d{4})Q([1-4])$/)
  if (!match) throw new Error(`Bad quarter key: ${quarter}`)
  const year = Number(match[1])
  const q = Number(match[2])
  return {
    start: new Date(Date.UTC(year, (q - 1) * 3, 1)),
    end: new Date(Date.UTC(year, q * 3, 1)),
  }
}

/**
 * IFTA filing due date: last day of the month after the quarter ends, rolled
 * forward to the next business day when that date is a Saturday or Sunday.
 *
 * Per the IFTA Procedures Manual (P1040): "When the due date falls on a
 * Saturday, Sunday, or legal holiday, the next business day is the due date."
 * We roll weekends only — legal holidays vary by jurisdiction and are not
 * modeled here, so a due date landing on a weekday holiday still shows on that
 * date. Rolling weekends stops the wall from flagging a filing overdue over a
 * weekend when the real deadline is the following Monday (e.g. 2025Q4 lands on
 * Saturday 2026-01-31 and is actually due Monday 2026-02-02).
 */
export function iftaDueDate(quarter: string): Date {
  const { end } = quarterRange(quarter)
  const due = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0))
  const dow = due.getUTCDay() // 0 = Sunday, 6 = Saturday
  if (dow === 6) due.setUTCDate(due.getUTCDate() + 2)
  else if (dow === 0) due.setUTCDate(due.getUTCDate() + 1)
  return due
}

/**
 * How far behind UTC the carrier's local midnight is. There is no timezone on
 * the carrier record, so this is a fixed, deterministic offset rather than a
 * runtime lookup: Pacific Standard Time (UTC−8), the westernmost of the
 * lower-48 zones and the offset actually in force on the January 31 due date.
 *
 * Using standard time year-round (never daylight time) means the wall can only
 * ever be an hour LATE calling a filing overdue, never an hour early — a false
 * "overdue" on a filing that is still on time is the failure that makes an
 * office stop trusting the compliance wall.
 */
const DUE_DATE_LOCAL_UTC_OFFSET_HOURS = 8

/**
 * The instant a quarter's filing stops being on time.
 *
 * iftaDueDate() returns UTC MIDNIGHT of the due date, i.e. the very start of
 * the day the filing is due — comparing `due < now` called a filing overdue
 * from 00:00Z of the due date, ~31 hours before the deadline actually passed
 * in the carrier's own time. A filing due the 31st is on time through 23:59
 * local on the 31st, so it is late only from local midnight of the 1st.
 */
export function iftaLateAfter(quarter: string): Date {
  const due = iftaDueDate(quarter)
  return new Date(due.getTime() + (24 + DUE_DATE_LOCAL_UTC_OFFSET_HOURS) * 3600_000)
}

/**
 * Whether a quarter's filing is past due at `now`. The ONE place the overdue
 * comparison lives, so the compliance wall and the IFTA worksheet screen can
 * never disagree about whether a quarter is late.
 */
export function iftaFilingIsLate(quarter: string, now: Date): boolean {
  return now.getTime() >= iftaLateAfter(quarter).getTime()
}
