/**
 * Fleet KPI math — the small-carrier analytical hook.
 *
 * Pure functions over already-summed cents/miles so they're unit-testable and
 * carry no DB/currency assumptions. Margins in trucking run near break-even
 * (ATRI 2024: ~$2.26 all-in cost/mile; truckload operating margin ~ -2.3%), so
 * cost-per-mile and operating ratio are the numbers a 1-20 truck owner lives by.
 *
 * Cost basis: `operatingCostCents` is what the per-truck P&L tracks — fuel +
 * maintenance + tolls + other tracked expenses, and NOT driver pay. Driver pay is about
 * 44% of a carrier's all-in cost per mile (ATRI 2025: 81.8c/mi wages + 21c/mi
 * benefits against $2.336/mi all-in), so a margin taken from the operating base
 * alone is not a margin at all — it is a margin *before driver pay*, and it
 * reads tens of points too good.
 *
 * So: pass `driverPayCents` and the all-in `operatingRatioPct` / `marginPct`
 * are emitted from the full base. Leave it out and those two come back null,
 * with the partial figures available only under names that say what they are
 * (`operatingRatioBeforeDriverPayPct`, `marginBeforeDriverPayPct`) — a caller
 * cannot accidentally render a partial number as net margin.
 */
export interface FleetKpiInput {
  revenueCents: number
  /** Operating costs we track per truck: fuel + maintenance + tolls + other expenses. Excludes driver pay. */
  operatingCostCents: number
  /**
   * Driver settlement pay over the same window. Null/omitted means "not
   * sourced" — never pass 0 for unknown, because 0 would silently produce a
   * flattering full-cost margin on a book that has simply never run payroll.
   */
  driverPayCents?: number | null
  loadedMiles: number
  deadheadMiles: number
}

export interface FleetKpis {
  revenueCents: number
  operatingCostCents: number
  /** Driver pay folded into the cost base, or null when it wasn't available. */
  driverPayCents: number | null
  /** operating + driver pay. Null when driver pay is unavailable. */
  totalCostCents: number | null
  /** Revenue - operating cost. Driver pay is NOT subtracted — not a net profit. */
  netBeforeDriverPayCents: number
  /** Revenue - (operating + driver pay). Null when driver pay is unavailable. */
  netCents: number | null
  loadedMiles: number
  deadheadMiles: number
  totalMiles: number
  /** Operating cost (excl. driver pay) per total mile, in cents. Null when no miles recorded. */
  cpmCents: number | null
  /** Revenue per loaded mile, in cents. Null when no loaded miles. */
  rpmCents: number | null
  /** Operating ratio = all-in cost / revenue, percent (<100 is profitable). Null without driver pay. */
  operatingRatioPct: number | null
  /** Operating ratio on the partial base — excludes driver pay, so always flatters. */
  operatingRatioBeforeDriverPayPct: number | null
  /** Net margin = all-in net / revenue, as a percent. Null without driver pay. */
  marginPct: number | null
  /** Margin on the partial base — excludes driver pay, so always flatters. */
  marginBeforeDriverPayPct: number | null
  /** Deadhead share = deadhead / total miles, as a percent. */
  deadheadPct: number | null
  /** Loaded share = loaded / total miles, as a percent. Complementary to deadheadPct (sums to 100). */
  loadedPct: number | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Per-truck P&L row, ranked worst-first by net/loaded-mile — the operational
 * cost basis (fuel + maintenance + tolls + other expenses), not driver pay, matching
 * `truckPnlRange`'s own net_cents. Worst-first because the fleet-wide margin
 * hides which one or two trucks are actually losing money (same reasoning as
 * the deadhead panel's per-truck sort).
 */
export interface TruckPerformanceInput {
  truckId: string
  unitNumber: string
  netCents: number
  loadedMiles: number
}

export interface TruckPerformanceRow extends TruckPerformanceInput {
  /** Net cents per loaded mile. Null when the truck had no loaded miles in range — can't be ranked. */
  netPerMileCents: number | null
}

export function rankTruckPerformance(rows: TruckPerformanceInput[]): TruckPerformanceRow[] {
  return rows
    .map((r) => ({ ...r, netPerMileCents: r.loadedMiles > 0 ? Math.round(r.netCents / r.loadedMiles) : null }))
    .sort((a, b) => {
      // Unranked (no miles) trucks sort last — a blank isn't a good number.
      if (a.netPerMileCents == null && b.netPerMileCents == null) return a.unitNumber.localeCompare(b.unitNumber)
      if (a.netPerMileCents == null) return 1
      if (b.netPerMileCents == null) return -1
      return a.netPerMileCents - b.netPerMileCents
    })
}

export function computeFleetKpis(input: FleetKpiInput): FleetKpis {
  const revenueCents = Math.round(input.revenueCents)
  const operatingCostCents = Math.round(input.operatingCostCents)
  const driverPayCents = input.driverPayCents == null ? null : Math.round(input.driverPayCents)
  const loadedMiles = Math.max(0, input.loadedMiles)
  const deadheadMiles = Math.max(0, input.deadheadMiles)
  const totalMiles = loadedMiles + deadheadMiles
  const netBeforeDriverPayCents = revenueCents - operatingCostCents
  const totalCostCents = driverPayCents == null ? null : operatingCostCents + driverPayCents
  const netCents = totalCostCents == null ? null : revenueCents - totalCostCents

  return {
    revenueCents,
    operatingCostCents,
    driverPayCents,
    totalCostCents,
    netBeforeDriverPayCents,
    netCents,
    loadedMiles,
    deadheadMiles,
    totalMiles,
    cpmCents: totalMiles > 0 ? Math.round(operatingCostCents / totalMiles) : null,
    rpmCents: loadedMiles > 0 ? Math.round(revenueCents / loadedMiles) : null,
    operatingRatioPct:
      revenueCents > 0 && totalCostCents != null ? round1((totalCostCents / revenueCents) * 100) : null,
    operatingRatioBeforeDriverPayPct:
      revenueCents > 0 ? round1((operatingCostCents / revenueCents) * 100) : null,
    marginPct: revenueCents > 0 && netCents != null ? round1((netCents / revenueCents) * 100) : null,
    marginBeforeDriverPayPct:
      revenueCents > 0 ? round1((netBeforeDriverPayCents / revenueCents) * 100) : null,
    deadheadPct: totalMiles > 0 ? round1((deadheadMiles / totalMiles) * 100) : null,
    // Derived from the unrounded deadhead share so the two always sum to 100 —
    // rounding loadedMiles/totalMiles independently could land on 93 + 7.4 = 100.4.
    loadedPct: totalMiles > 0 ? round1(100 - (deadheadMiles / totalMiles) * 100) : null,
  }
}
