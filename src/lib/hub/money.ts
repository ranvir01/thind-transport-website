/**
 * Pure money math — integer cents only, no DB, fully unit-tested.
 * Settlement, invoice, AR aging, and FSC calculations live here so they can
 * be verified to the penny against hand-computed fixtures.
 */
import type { Accessorial } from "./types"

// ---- Rounding ----

/** Round half away from zero to an integer (money rounding). */
export function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value))
}

// ---- Invoice ----

export interface InvoiceInputs {
  linehaulCents: number
  fuelSurchargeCents: number
  accessorials: Accessorial[]
}

export function invoiceTotalCents(inputs: InvoiceInputs): number {
  return (
    inputs.linehaulCents +
    inputs.fuelSurchargeCents +
    inputs.accessorials.reduce((sum, a) => sum + Number(a.amount_cents || 0), 0)
  )
}

// ---- AR aging ----

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+"

/** Bucket by days past due (dueOn vs asOf, date-only semantics). */
export function agingBucket(dueOn: Date, asOf: Date): AgingBucket {
  const msPerDay = 86400000
  const due = Date.UTC(dueOn.getUTCFullYear(), dueOn.getUTCMonth(), dueOn.getUTCDate())
  const now = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate())
  const daysPast = Math.floor((now - due) / msPerDay)
  if (daysPast <= 0) return "current"
  if (daysPast <= 30) return "1-30"
  if (daysPast <= 60) return "31-60"
  if (daysPast <= 90) return "61-90"
  return "90+"
}

// ---- Fuel surcharge ----

/**
 * Standard DOE-index FSC: (index − base) ÷ MPG, floored at zero.
 * Returns cents-per-mile with 4-decimal precision (a rate, not money).
 */
export function fscCentsPerMile(
  indexCentsPerGallon: number,
  baseCentsPerGallon: number,
  mpg: number
): number {
  if (mpg <= 0) return 0
  const raw = (indexCentsPerGallon - baseCentsPerGallon) / mpg
  return Math.max(0, Math.round(raw * 10000) / 10000)
}

/** Per-load FSC in integer cents from miles × rate. */
export function fscTotalCents(miles: number, centsPerMile: number): number {
  return roundHalfAwayFromZero(miles * centsPerMile)
}

// ---- Settlements ----

export interface SettlementLoadInput {
  id: string
  reference: string
  linehaulCents: number
  fuelSurchargeCents: number
  accessorialCents: number
  loadedMiles: number
  deadheadMiles: number
}

export interface SettlementDriverConfig {
  payType: "per_mile" | "percentage"
  /** $/mile for per_mile drivers; fraction (0.90) for percentage drivers. */
  payRate: number
  payLoadedMilesOnly: boolean
  escrowWeeklyCents: number
  insuranceWeeklyCents: number
}

export interface SettlementLineDraft {
  kind: "earning" | "reimbursement" | "deduction"
  label: string
  amountCents: number
  sourceType?: string
  sourceId?: string
}

export interface SettlementDraft {
  lines: SettlementLineDraft[]
  grossCents: number
  deductionsCents: number
  netCents: number
}

/**
 * Compute a settlement draft.
 *
 * Company drivers (per_mile): miles × rate per load (loaded miles, or
 * loaded+deadhead when payLoadedMilesOnly is false).
 * Owner-operators (percentage): pct × (linehaul + accessorials) + 100% of FSC.
 * Reimbursements add; advances, escrow, and insurance deduct.
 */
export function computeSettlement(
  loads: SettlementLoadInput[],
  config: SettlementDriverConfig,
  reimbursements: { label: string; amountCents: number; sourceId?: string }[],
  outstandingAdvances: { id: string; reference: string | null; amountCents: number }[]
): SettlementDraft {
  const lines: SettlementLineDraft[] = []

  for (const load of loads) {
    let amount: number
    if (config.payType === "per_mile") {
      const miles = config.payLoadedMilesOnly
        ? load.loadedMiles
        : load.loadedMiles + load.deadheadMiles
      amount = roundHalfAwayFromZero(miles * config.payRate * 100)
      lines.push({
        kind: "earning",
        label: `${load.reference} — ${miles} mi × $${config.payRate.toFixed(2)}/mi`,
        amountCents: amount,
        sourceType: "load",
        sourceId: load.id,
      })
    } else {
      const revenueBase = load.linehaulCents + load.accessorialCents
      const commission = roundHalfAwayFromZero(revenueBase * config.payRate)
      amount = commission + load.fuelSurchargeCents
      lines.push({
        kind: "earning",
        label: `${load.reference} — ${Math.round(config.payRate * 100)}% of $${(revenueBase / 100).toFixed(2)} + FSC $${(load.fuelSurchargeCents / 100).toFixed(2)}`,
        amountCents: amount,
        sourceType: "load",
        sourceId: load.id,
      })
    }
  }

  for (const r of reimbursements) {
    lines.push({
      kind: "reimbursement",
      label: r.label,
      amountCents: r.amountCents,
      sourceType: "expense",
      sourceId: r.sourceId,
    })
  }

  for (const advance of outstandingAdvances) {
    lines.push({
      kind: "deduction",
      label: `Advance${advance.reference ? ` (${advance.reference})` : ""}`,
      amountCents: advance.amountCents,
      sourceType: "advance",
      sourceId: advance.id,
    })
  }
  if (config.escrowWeeklyCents > 0 && loads.length > 0) {
    lines.push({ kind: "deduction", label: "Escrow contribution", amountCents: config.escrowWeeklyCents, sourceType: "escrow" })
  }
  if (config.insuranceWeeklyCents > 0 && loads.length > 0) {
    lines.push({ kind: "deduction", label: "Insurance", amountCents: config.insuranceWeeklyCents, sourceType: "insurance" })
  }

  const grossCents = lines
    .filter((l) => l.kind !== "deduction")
    .reduce((sum, l) => sum + l.amountCents, 0)
  const deductionsCents = lines
    .filter((l) => l.kind === "deduction")
    .reduce((sum, l) => sum + l.amountCents, 0)

  return { lines, grossCents, deductionsCents, netCents: grossCents - deductionsCents }
}

// ---- Detention ----

/** Detention owed in cents given stop dwell, free time, and hourly rate. */
export function detentionCents(
  arrivedAt: Date,
  departedAt: Date,
  freeHours: number,
  ratePerHourCents: number
): number {
  const dwellHours = (departedAt.getTime() - arrivedAt.getTime()) / 3600000
  const billable = Math.max(0, dwellHours - freeHours)
  return roundHalfAwayFromZero(billable * ratePerHourCents)
}
