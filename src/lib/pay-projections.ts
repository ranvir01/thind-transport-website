/**
 * Five-year earnings projections DERIVED from PAY_RATES — the constants the
 * whole recruiting site quotes — instead of hand-typed figures beside them.
 * The old card said "$425K" and "$1M+" as literals; when PAY_RATES moved,
 * nothing moved them, which is how a projection quietly becomes a claim
 * (see docs/OWNER-CHECKLIST.md, "claims removed" table, for how that ends).
 *
 * These are projections at TODAY'S published rates, labeled as such — ranges
 * multiplied out, never a cherry-picked single number.
 */
import { PAY_RATES } from "./constants"

/** "$69K-$82K" | "$150K-$250K" → [69000, 82000] dollars. Throws on drift so
 * a reformatted constant fails the build, not the arithmetic. */
export function parseAnnualRange(range: string): [number, number] {
  const matches = [...range.matchAll(/\$(\d+(?:\.\d+)?)K/gi)].map((m) => Number(m[1]) * 1000)
  if (matches.length !== 2 || matches.some((n) => !Number.isFinite(n) || n <= 0)) {
    throw new Error(`parseAnnualRange: unrecognized range "${range}" — update the parser with the constant`)
  }
  return [Math.min(matches[0]!, matches[1]!), Math.max(matches[0]!, matches[1]!)]
}

const compact = (dollars: number) =>
  dollars >= 1_000_000
    ? `$${(dollars / 1_000_000).toFixed(dollars % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "")}M`
    : `$${Math.round(dollars / 1000)}K`

export interface FiveYearProjection {
  companyOtr: { label: string; low: number; high: number }
  ownerOperator: { label: string; low: number; high: number }
  /** O/O midpoint over company midpoint, as a whole "% more". */
  ooAdvantagePct: number
  /** Company bar width relative to the O/O bar, percent (for the chart). */
  companyBarPct: number
}

export function fiveYearProjection(): FiveYearProjection {
  const [cLow, cHigh] = parseAnnualRange(PAY_RATES.companyDriver.otr.annual)
  const [oLow, oHigh] = parseAnnualRange(PAY_RATES.ownerOperator.annualGross)
  const company = { low: cLow * 5, high: cHigh * 5 }
  const oo = { low: oLow * 5, high: oHigh * 5 }
  const companyMid = (company.low + company.high) / 2
  const ooMid = (oo.low + oo.high) / 2
  return {
    companyOtr: { ...company, label: `${compact(company.low)}–${compact(company.high)}` },
    ownerOperator: { ...oo, label: `${compact(oo.low)}–${compact(oo.high)}` },
    ooAdvantagePct: Math.round((ooMid / companyMid - 1) * 100),
    companyBarPct: Math.round((company.high / oo.high) * 100),
  }
}
