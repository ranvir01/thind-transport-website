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

/** "2026Q2"-style key for a date; IFTA quarters are calendar quarters. */
export function quarterKey(date: Date): string {
  return `${date.getUTCFullYear()}Q${Math.floor(date.getUTCMonth() / 3) + 1}`
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

/** IFTA filing due date: last day of the month after the quarter ends. */
export function iftaDueDate(quarter: string): Date {
  const { end } = quarterRange(quarter)
  return new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0))
}
