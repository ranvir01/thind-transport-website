/**
 * Generic pay-rules evaluator (retrofit E13) — the single seam the settlement
 * engine consumes. Company per-mile and owner-operator percentage are just two
 * rule sets; new pay programs (flat per load, extra-stop pay, scorecard or
 * referral bonuses, percent-of-gross admin fees) are data, not code forks.
 *
 * Pure module: integer cents in, integer cents out, no DB, penny-exact tests.
 */
import { roundHalfAwayFromZero } from "./rounding"

// ---- Rule & deduction shapes (stored as JSONB in hub.pay_rules) ----

export type PayRule =
  | { type: "per_mile"; rateCentsPerMile: number; loadedOnly?: boolean }
  | { type: "percent_linehaul"; basisPoints: number }
  | { type: "percent_total"; basisPoints: number }
  | { type: "percent_accessorials"; basisPoints: number }
  | { type: "fsc_passthrough"; basisPoints: number }
  | { type: "flat_per_load"; amountCents: number }
  | { type: "per_stop"; amountCents: number; afterStops?: number }
  | { type: "referral_bonus" }
  | { type: "scorecard_bonus"; tiers: { minScore: number; amountCents: number }[] }

export type PayDeduction =
  | { kind: "escrow"; amountCents: number; label?: string }
  | { kind: "insurance"; amountCents: number; label?: string }
  | { kind: "flat_recurring"; amountCents: number; label: string }
  | { kind: "percent_of_gross"; basisPoints: number; label: string }

export interface PayRuleSet {
  name: string
  rules: PayRule[]
  deductions: PayDeduction[]
}

// ---- Evaluation context ----

export interface PayLoadContext {
  id: string
  reference: string
  linehaulCents: number
  fuelSurchargeCents: number
  accessorialCents: number
  loadedMiles: number
  deadheadMiles: number
  /** Total stops on the load (extra-stop pay kicks in past `afterStops`). */
  stopsCount?: number
  /**
   * Portion of `accessorialCents` that is detention (auto-billed when a stop
   * closes). Percent rules whose base includes accessorials itemize this as
   * its own earning line so drivers can see detention pay by name; totals are
   * penny-identical with or without it.
   */
  detentionCents?: number
}

export interface PayPeriodContext {
  loads: PayLoadContext[]
  reimbursements: { label: string; amountCents: number; sourceId?: string }[]
  outstandingAdvances: { id: string; reference: string | null; amountCents: number }[]
  /** Referral bonuses payable this period (E5) — consumed by referral_bonus. */
  referralBonuses?: { label: string; amountCents: number; sourceId?: string }[]
  /** Driver's composite scorecard for the period (E5) — for scorecard_bonus tiers. */
  scorecardScore?: number | null
}

export interface PayLineDraft {
  kind: "earning" | "reimbursement" | "deduction"
  label: string
  amountCents: number
  sourceType?: string
  sourceId?: string
}

export interface PayDraft {
  lines: PayLineDraft[]
  grossCents: number
  deductionsCents: number
  netCents: number
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`
const pct = (basisPoints: number) => `${(basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 2)}%`

/** Detention portion of a load's accessorials, clamped to what's actually billed. */
const detentionPortion = (load: PayLoadContext) =>
  Math.min(Math.max(load.detentionCents ?? 0, 0), load.accessorialCents)

/**
 * Split a percent-of-base earning into a named detention line plus the rest.
 * The detention share is rounded on its own and the remainder absorbs the
 * difference, so the two lines always sum to exactly `totalCents` — nobody's
 * pay changes by a penny, it just becomes legible.
 */
function splitDetentionLine(
  load: PayLoadContext,
  basisPoints: number,
  totalCents: number,
  restLabel: string
): PayLineDraft[] {
  const detention = detentionPortion(load)
  const base = { kind: "earning" as const, sourceType: "load", sourceId: load.id }
  if (detention === 0) return [{ ...base, label: restLabel, amountCents: totalCents }]
  const detentionShare = roundHalfAwayFromZero((detention * basisPoints) / 10000)
  return [
    { ...base, label: restLabel, amountCents: totalCents - detentionShare },
    {
      ...base,
      label: `${load.reference} — ${pct(basisPoints)} of detention ${dollars(detention)}`,
      amountCents: detentionShare,
    },
  ]
}

/** Earnings a single rule produces for a single load (integer cents). */
function evaluateRuleForLoad(rule: PayRule, load: PayLoadContext): PayLineDraft[] {
  switch (rule.type) {
    case "per_mile": {
      const miles =
        rule.loadedOnly === false ? load.loadedMiles + load.deadheadMiles : load.loadedMiles
      const amount = roundHalfAwayFromZero(miles * rule.rateCentsPerMile)
      return [{
        kind: "earning",
        label: `${load.reference} — ${miles} mi × ${dollars(rule.rateCentsPerMile)}/mi`,
        amountCents: amount,
        sourceType: "load",
        sourceId: load.id,
      }]
    }
    case "percent_linehaul": {
      const base = load.linehaulCents + load.accessorialCents
      const amount = roundHalfAwayFromZero((base * rule.basisPoints) / 10000)
      return splitDetentionLine(
        load,
        rule.basisPoints,
        amount,
        `${load.reference} — ${pct(rule.basisPoints)} of ${dollars(base - detentionPortion(load))}`
      )
    }
    case "percent_total": {
      const base = load.linehaulCents + load.fuelSurchargeCents + load.accessorialCents
      const amount = roundHalfAwayFromZero((base * rule.basisPoints) / 10000)
      return splitDetentionLine(
        load,
        rule.basisPoints,
        amount,
        `${load.reference} — ${pct(rule.basisPoints)} of ${dollars(base - detentionPortion(load))} (all-in)`
      )
    }
    case "percent_accessorials": {
      if (load.accessorialCents === 0) return []
      const amount = roundHalfAwayFromZero((load.accessorialCents * rule.basisPoints) / 10000)
      return splitDetentionLine(
        load,
        rule.basisPoints,
        amount,
        `${load.reference} — ${pct(rule.basisPoints)} of accessorials ${dollars(load.accessorialCents - detentionPortion(load))}`
      )
    }
    case "fsc_passthrough": {
      if (load.fuelSurchargeCents === 0) return []
      const amount = roundHalfAwayFromZero((load.fuelSurchargeCents * rule.basisPoints) / 10000)
      return [{
        kind: "earning",
        label: `${load.reference} — fuel surcharge ${rule.basisPoints === 10000 ? "" : `${pct(rule.basisPoints)} of `}${dollars(load.fuelSurchargeCents)}`,
        amountCents: amount,
        sourceType: "load",
        sourceId: load.id,
      }]
    }
    case "flat_per_load":
      return [{
        kind: "earning",
        label: `${load.reference} — flat rate`,
        amountCents: rule.amountCents,
        sourceType: "load",
        sourceId: load.id,
      }]
    case "per_stop": {
      const threshold = rule.afterStops ?? 2
      const extraStops = Math.max(0, (load.stopsCount ?? 0) - threshold)
      if (extraStops === 0) return []
      return [{
        kind: "earning",
        label: `${load.reference} — ${extraStops} extra stop${extraStops > 1 ? "s" : ""} × ${dollars(rule.amountCents)}`,
        amountCents: extraStops * rule.amountCents,
        sourceType: "load",
        sourceId: load.id,
      }]
    }
    default:
      return []
  }
}

/**
 * Evaluate a rule set over a settlement period. The settlement engine calls
 * ONLY this function — it never branches on pay type itself.
 */
export function evaluatePayRules(ruleSet: PayRuleSet, ctx: PayPeriodContext): PayDraft {
  const lines: PayLineDraft[] = []

  // Per-load earning rules, in rule order then load order (statement readability).
  for (const load of ctx.loads) {
    for (const rule of ruleSet.rules) {
      for (const line of evaluateRuleForLoad(rule, load)) {
        if (line.amountCents !== 0 || rule.type === "flat_per_load") lines.push(line)
      }
    }
  }

  // Period-level earning rules.
  for (const rule of ruleSet.rules) {
    if (rule.type === "referral_bonus") {
      for (const bonus of ctx.referralBonuses ?? []) {
        lines.push({
          kind: "earning",
          label: bonus.label,
          amountCents: bonus.amountCents,
          sourceType: "referral",
          sourceId: bonus.sourceId,
        })
      }
    }
    if (rule.type === "scorecard_bonus" && ctx.scorecardScore != null) {
      const tier = [...rule.tiers]
        .sort((a, b) => b.minScore - a.minScore)
        .find((t) => ctx.scorecardScore! >= t.minScore)
      if (tier && tier.amountCents > 0) {
        lines.push({
          kind: "earning",
          label: `Safety & performance bonus (score ${ctx.scorecardScore})`,
          amountCents: tier.amountCents,
          sourceType: "scorecard",
        })
      }
    }
  }

  for (const r of ctx.reimbursements) {
    lines.push({
      kind: "reimbursement",
      label: r.label,
      amountCents: r.amountCents,
      sourceType: "expense",
      sourceId: r.sourceId,
    })
  }

  for (const advance of ctx.outstandingAdvances) {
    lines.push({
      kind: "deduction",
      label: `Advance${advance.reference ? ` (${advance.reference})` : ""}`,
      amountCents: advance.amountCents,
      sourceType: "advance",
      sourceId: advance.id,
    })
  }

  // Recurring deductions only apply when the period actually pays something.
  const hasEarnings = lines.some((l) => l.kind === "earning")
  const grossSoFar = lines
    .filter((l) => l.kind !== "deduction")
    .reduce((sum, l) => sum + l.amountCents, 0)

  if (hasEarnings) {
    for (const d of ruleSet.deductions) {
      if (d.kind === "escrow" && d.amountCents > 0) {
        lines.push({ kind: "deduction", label: d.label ?? "Escrow contribution", amountCents: d.amountCents, sourceType: "escrow" })
      } else if (d.kind === "insurance" && d.amountCents > 0) {
        lines.push({ kind: "deduction", label: d.label ?? "Insurance", amountCents: d.amountCents, sourceType: "insurance" })
      } else if (d.kind === "flat_recurring" && d.amountCents > 0) {
        lines.push({ kind: "deduction", label: d.label, amountCents: d.amountCents, sourceType: "recurring" })
      } else if (d.kind === "percent_of_gross" && d.basisPoints > 0) {
        lines.push({
          kind: "deduction",
          label: `${d.label} (${pct(d.basisPoints)} of gross)`,
          amountCents: roundHalfAwayFromZero((grossSoFar * d.basisPoints) / 10000),
          sourceType: "recurring",
        })
      }
    }
  }

  const grossCents = lines
    .filter((l) => l.kind !== "deduction")
    .reduce((sum, l) => sum + l.amountCents, 0)
  const deductionsCents = lines
    .filter((l) => l.kind === "deduction")
    .reduce((sum, l) => sum + l.amountCents, 0)

  return { lines, grossCents, deductionsCents, netCents: grossCents - deductionsCents }
}

// ---- Legacy bridge ----

/**
 * Convert the original two-pay-type driver config into an equivalent rule set.
 * Mirrors the SQL seed in migration 005 so legacy drivers settle identically.
 */
export function legacyConfigToRuleSet(config: {
  payType: "per_mile" | "percentage"
  payRate: number
  payLoadedMilesOnly: boolean
  escrowWeeklyCents: number
  insuranceWeeklyCents: number
}): PayRuleSet {
  const deductions: PayDeduction[] = []
  if (config.escrowWeeklyCents > 0) deductions.push({ kind: "escrow", amountCents: config.escrowWeeklyCents })
  if (config.insuranceWeeklyCents > 0) deductions.push({ kind: "insurance", amountCents: config.insuranceWeeklyCents })

  if (config.payType === "percentage") {
    return {
      name: "Owner-operator percentage",
      rules: [
        { type: "percent_linehaul", basisPoints: Math.round(config.payRate * 10000) },
        { type: "fsc_passthrough", basisPoints: 10000 },
        { type: "referral_bonus" },
      ],
      deductions,
    }
  }
  return {
    name: "Company per-mile",
    rules: [
      {
        type: "per_mile",
        rateCentsPerMile: Math.round(config.payRate * 100),
        loadedOnly: config.payLoadedMilesOnly,
      },
      { type: "referral_bonus" },
    ],
    deductions,
  }
}

/** Plain-language description of a rule set for non-technical screens. */
export function describePayRules(ruleSet: PayRuleSet): { earnings: string[]; deductions: string[] } {
  const earnings: string[] = []
  for (const rule of ruleSet.rules) {
    switch (rule.type) {
      case "per_mile":
        earnings.push(
          `${dollars(rule.rateCentsPerMile)} per ${rule.loadedOnly === false ? "mile (loaded + deadhead)" : "loaded mile"}`
        )
        break
      case "percent_linehaul":
        earnings.push(`${pct(rule.basisPoints)} of the load rate (linehaul + accessorials)`)
        break
      case "percent_total":
        earnings.push(`${pct(rule.basisPoints)} of everything the load pays (all-in)`)
        break
      case "percent_accessorials":
        earnings.push(`${pct(rule.basisPoints)} of accessorial charges`)
        break
      case "fsc_passthrough":
        earnings.push(
          rule.basisPoints === 10000 ? "100% of the fuel surcharge" : `${pct(rule.basisPoints)} of the fuel surcharge`
        )
        break
      case "flat_per_load":
        earnings.push(`${dollars(rule.amountCents)} flat per load`)
        break
      case "per_stop":
        earnings.push(`${dollars(rule.amountCents)} per extra stop (after ${rule.afterStops ?? 2})`)
        break
      case "referral_bonus":
        earnings.push("Referral bonuses when they come due")
        break
      case "scorecard_bonus":
        earnings.push(
          `Performance bonus: ${[...rule.tiers].sort((a, b) => b.minScore - a.minScore).map((t) => `${dollars(t.amountCents)} at score ${t.minScore}+`).join(", ")}`
        )
        break
    }
  }
  const deductions: string[] = []
  for (const d of ruleSet.deductions) {
    if (d.kind === "escrow") deductions.push(`${dollars(d.amountCents)} escrow each settlement`)
    else if (d.kind === "insurance") deductions.push(`${dollars(d.amountCents)} insurance each settlement`)
    else if (d.kind === "flat_recurring") deductions.push(`${dollars(d.amountCents)} ${d.label} each settlement`)
    else if (d.kind === "percent_of_gross") deductions.push(`${d.label}: ${pct(d.basisPoints)} of gross`)
  }
  return { earnings, deductions }
}

/**
 * Compact one-line summary of a rule set's earning rules for headers and
 * subtitles (e.g. "90% linehaul + 100% FSC", "$0.63/loaded mi"). Situational
 * bonus rules (referral, scorecard) are omitted — they don't describe the
 * base pay program.
 */
export function summarizePayRules(ruleSet: PayRuleSet): string {
  const parts: string[] = []
  for (const rule of ruleSet.rules) {
    switch (rule.type) {
      case "per_mile":
        parts.push(`${dollars(rule.rateCentsPerMile)}/${rule.loadedOnly === false ? "all mi" : "loaded mi"}`)
        break
      case "percent_linehaul":
        parts.push(`${pct(rule.basisPoints)} linehaul`)
        break
      case "percent_total":
        parts.push(`${pct(rule.basisPoints)} all-in`)
        break
      case "percent_accessorials":
        parts.push(`${pct(rule.basisPoints)} accessorials`)
        break
      case "fsc_passthrough":
        parts.push(`${pct(rule.basisPoints)} FSC`)
        break
      case "flat_per_load":
        parts.push(`${dollars(rule.amountCents)}/load`)
        break
      case "per_stop":
        parts.push(`${dollars(rule.amountCents)}/extra stop`)
        break
    }
  }
  return parts.join(" + ")
}

/**
 * Validate one rule from a JSONB payload. Unknown `type`s are dropped (silent
 * no-op in evaluatePayRules, so dropping them at parse time changes nothing);
 * a *known* type with a malformed field (wrong JS type, negative, or a
 * basisPoints outside 0-10000) throws instead of reaching the evaluator,
 * which does no range checking of its own and would otherwise divide by
 * whatever it was handed.
 */
function parseRule(raw: unknown): PayRule | null {
  if (typeof raw !== "object" || raw === null || typeof (raw as { type?: unknown }).type !== "string") return null
  const r = raw as Record<string, unknown>
  const bad = (field: string): never => {
    throw new Error(`parseRuleSet: rule type "${r.type}" has invalid ${field}: ${JSON.stringify(r[field])}`)
  }
  switch (r.type) {
    case "per_mile":
      if (typeof r.rateCentsPerMile !== "number" || !Number.isFinite(r.rateCentsPerMile) || r.rateCentsPerMile < 0) {
        bad("rateCentsPerMile")
      }
      return r as PayRule
    case "percent_linehaul":
    case "percent_total":
    case "percent_accessorials":
    case "fsc_passthrough":
      if (
        typeof r.basisPoints !== "number" ||
        !Number.isFinite(r.basisPoints) ||
        r.basisPoints < 0 ||
        r.basisPoints > 10000
      ) {
        bad("basisPoints")
      }
      return r as PayRule
    case "flat_per_load":
    case "per_stop":
      if (typeof r.amountCents !== "number" || !Number.isFinite(r.amountCents) || r.amountCents < 0) {
        bad("amountCents")
      }
      return r as PayRule
    case "referral_bonus":
      return r as PayRule
    case "scorecard_bonus":
      if (!Array.isArray(r.tiers)) bad("tiers")
      return r as PayRule
    default:
      return null
  }
}


const KNOWN_DEDUCTION_KINDS = new Set<PayDeduction["kind"]>([
  "escrow", "insurance", "flat_recurring", "percent_of_gross",
])

const isFiniteNonNegative = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0
// Basis points express 0-100%; outside 0-10000 can never be an intentional rate.
const isValidBasisPoints = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 10000

/**
 * Deductions come off a driver's gross, so a malformed one is dropped rather
 * than trusted: unlike a rule (whose absence silently underpays and therefore
 * throws), an unparseable deduction that we skip can only ever pay the driver
 * MORE, which is the safe direction to fail while the office fixes the row.
 */
function isValidDeduction(deduction: unknown): deduction is PayDeduction {
  if (!deduction || typeof deduction !== "object") return false
  const d = deduction as Record<string, unknown>
  if (typeof d.kind !== "string" || !KNOWN_DEDUCTION_KINDS.has(d.kind as PayDeduction["kind"])) return false
  switch (d.kind as PayDeduction["kind"]) {
    case "escrow":
    case "insurance":
    case "flat_recurring":
      return isFiniteNonNegative(d.amountCents)
    case "percent_of_gross":
      return isValidBasisPoints(d.basisPoints) && typeof d.label === "string"
    default:
      return false
  }
}

/** Validate/normalize a rules JSONB payload from the DB (defensive parse). */
export function parseRuleSet(row: {
  name: string
  rules: unknown
  deductions: unknown
}): PayRuleSet {
  const rawRules = Array.isArray(row.rules) ? row.rules : []
  const rules = rawRules.map(parseRule).filter((r): r is PayRule => r !== null)
  const deductions = Array.isArray(row.deductions) ? row.deductions.filter(isValidDeduction) : []
  return { name: row.name, rules, deductions }
}
