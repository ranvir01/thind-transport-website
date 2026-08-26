/**
 * Pure fuel-classification and IFTA-aggregation helpers.
 *
 * Correctness rule (binding retrofit): reefer fuel is NOT propulsion fuel.
 * It is IFTA-exempt and must be excluded from fleet MPG and from tax-paid
 * gallons. DEF and additives are not motor fuel at all. Only tractor (road)
 * diesel counts toward IFTA.
 */
import type { FuelUse } from "./types"

const REEFER_PATTERNS = [
  /\breefer\b/i,
  /\brfr\b/i,
  /refrig/i,
  /\bthermo\s*king\b/i,
  /\breef\b/i,
]

const OTHER_PATTERNS = [
  /\bdef\b/i,
  /diesel\s*exhaust/i,
  /additive/i,
  /\boil\b/i,
  /\bmerch/i,
  /\bwash\b/i,
  /\bscale\b/i,
]

/**
 * Classify a pump product description (card statements call it product,
 * item, or fuel type). Defaults to tractor — road diesel is the common case
 * and misclassifying tractor fuel as exempt would understate tax-paid
 * credits, never understate tax owed.
 */
export function classifyFuelUse(productDescription: string | null | undefined): FuelUse {
  const text = (productDescription ?? "").trim()
  if (!text) return "tractor"
  if (REEFER_PATTERNS.some((re) => re.test(text))) return "reefer"
  if (OTHER_PATTERNS.some((re) => re.test(text))) return "other"
  return "tractor"
}

export interface FuelRowForIfta {
  jurisdiction: string | null
  gallons: number
  fuelUse: FuelUse
}

/**
 * Tax-paid gallons by jurisdiction for the IFTA worksheet: tractor fuel only.
 * Reefer and other gallons are excluded — they are exempt, not credited.
 */
export function aggregateTaxPaidGallons(rows: FuelRowForIfta[]): Record<string, number> {
  const byJurisdiction: Record<string, number> = {}
  for (const row of rows) {
    if (row.fuelUse !== "tractor") continue
    if (!row.jurisdiction) continue
    byJurisdiction[row.jurisdiction] = (byJurisdiction[row.jurisdiction] ?? 0) + row.gallons
  }
  return byJurisdiction
}

/** Propulsion gallons for fleet MPG (same exemption rule as the worksheet). */
export function propulsionGallons(rows: FuelRowForIfta[]): number {
  return rows.reduce((sum, r) => (r.fuelUse === "tractor" ? sum + r.gallons : sum), 0)
}

/** Total pump spend in cents for a set of transactions. Pure (client + test safe). */
export function fuelSpendCents(rows: { total_cents: number }[]): number {
  return rows.reduce((sum, r) => sum + (r.total_cents || 0), 0)
}

/**
 * Load economics after fuel: revenue minus the fuel actually burned on it.
 * Shown on the load detail once pump receipts are reconciled to the load. Pure.
 */
export function netAfterFuelCents(revenueCents: number, fuelRows: { total_cents: number }[]): number {
  return revenueCents - fuelSpendCents(fuelRows)
}
