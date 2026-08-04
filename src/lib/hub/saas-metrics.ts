/**
 * SaaS metrics for the LoadOff business itself — MRR, NRR, logo churn, ARPU,
 * CAC payback, Rule of 40.
 *
 * Instrumented BEFORE billing exists on purpose: the inputs are plain rows
 * (carrier, month, billed cents, trucks), so today they come from the
 * simulation seed and the day Stripe billing goes live the same functions run
 * on real invoices — the owner's standing rule that simulated data must be
 * swappable for real data without a rewrite.
 *
 * Definitions pinned here so the numbers mean the same thing every month:
 *  - MRR: sum of billed subscription cents in the month. No annualizing.
 *  - NRR (cohort form): revenue THIS month from carriers who were billed
 *    LAST month ÷ last month's total. Expansion (more trucks) pushes it over
 *    100%; downgrades and churn pull it under. New logos are excluded — that
 *    is the entire point of the metric.
 *  - Logo churn: carriers billed last month and not this month ÷ last
 *    month's logo count.
 *  - ARPU: MRR ÷ billed trucks — LoadOff prices per truck, so ARPU is per
 *    TRUCK, not per logo.
 *  - CAC payback months: acquisition spend per new logo ÷ (monthly revenue
 *    per logo × gross margin). Under 12 is genuinely good for SMB self-serve.
 *  - Rule of 40: YoY revenue growth % + operating margin %. Growth uses the
 *    same month a year earlier; null until 13 months of history exist,
 *    because an annualized two-month-old product growth number is noise
 *    dressed as a KPI.
 *
 * Pure module: integer cents in, integers/percentages out, no DB, no clock.
 */

export interface BillingRow {
  carrierId: string
  /** Calendar month, "YYYY-MM". */
  month: string
  /** Subscription revenue billed for the month, integer cents. */
  billedCents: number
  /** Trucks billed (per-truck pricing) — drives ARPU. */
  trucks: number
}

export interface SaasMonthMetrics {
  month: string
  mrrCents: number
  billedLogos: number
  billedTrucks: number
  /** Per-truck monthly revenue, integer cents (rounded). Null with 0 trucks. */
  arpuPerTruckCents: number | null
  /** Net revenue retention vs the prior month's cohort, percent. Null without a prior month. */
  nrrPct: number | null
  /** Logos billed last month that vanished this month, percent. Null without a prior month. */
  logoChurnPct: number | null
  /** YoY growth + margin. Null until a year-ago month exists. */
  ruleOf40: number | null
}

const prevMonth = (month: string): string => {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y!, m! - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

const yearAgo = (month: string): string => `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`

const round1 = (n: number) => Math.round(n * 10) / 10

export function computeSaasMonth(
  rows: BillingRow[],
  month: string,
  opts: { operatingMarginPct?: number } = {}
): SaasMonthMetrics {
  const inMonth = rows.filter((r) => r.month === month && r.billedCents > 0)
  const prior = rows.filter((r) => r.month === prevMonth(month) && r.billedCents > 0)
  const priorIds = new Set(prior.map((r) => r.carrierId))

  const mrrCents = inMonth.reduce((s, r) => s + r.billedCents, 0)
  const billedTrucks = inMonth.reduce((s, r) => s + r.trucks, 0)

  // NRR: this month's revenue from last month's cohort only.
  const priorMrr = prior.reduce((s, r) => s + r.billedCents, 0)
  const retainedMrr = inMonth
    .filter((r) => priorIds.has(r.carrierId))
    .reduce((s, r) => s + r.billedCents, 0)
  const nrrPct = priorMrr > 0 ? round1((retainedMrr / priorMrr) * 100) : null

  // Logo churn.
  const thisIds = new Set(inMonth.map((r) => r.carrierId))
  const lost = [...priorIds].filter((id) => !thisIds.has(id)).length
  const logoChurnPct = priorIds.size > 0 ? round1((lost / priorIds.size) * 100) : null

  // Rule of 40, only when a year-ago month exists in the data.
  const yearAgoMrr = rows
    .filter((r) => r.month === yearAgo(month) && r.billedCents > 0)
    .reduce((s, r) => s + r.billedCents, 0)
  const ruleOf40 =
    yearAgoMrr > 0 && opts.operatingMarginPct !== undefined
      ? round1(((mrrCents - yearAgoMrr) / yearAgoMrr) * 100 + opts.operatingMarginPct)
      : null

  return {
    month,
    mrrCents,
    billedLogos: thisIds.size,
    billedTrucks,
    arpuPerTruckCents: billedTrucks > 0 ? Math.round(mrrCents / billedTrucks) : null,
    nrrPct,
    logoChurnPct,
    ruleOf40,
  }
}

/**
 * CAC payback in months. Spend and revenue are integer cents; margin is a
 * percent (0–100). Null when nothing was acquired or nothing is earned —
 * never Infinity, which renders as a KPI-shaped absurdity.
 */
export function cacPaybackMonths(input: {
  acquisitionSpendCents: number
  newLogos: number
  monthlyRevenuePerLogoCents: number
  grossMarginPct: number
}): number | null {
  const { acquisitionSpendCents, newLogos, monthlyRevenuePerLogoCents, grossMarginPct } = input
  if (newLogos <= 0 || monthlyRevenuePerLogoCents <= 0 || grossMarginPct <= 0) return null
  const cacCents = acquisitionSpendCents / newLogos
  const monthlyContributionCents = (monthlyRevenuePerLogoCents * grossMarginPct) / 100
  return round1(cacCents / monthlyContributionCents)
}
