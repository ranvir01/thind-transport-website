/**
 * Fleet KPI math — the small-carrier analytical hook.
 *
 * Pure functions over already-summed cents/miles so they're unit-testable and
 * carry no DB/currency assumptions. Margins in trucking run near break-even
 * (ATRI 2024: ~$2.26 all-in cost/mile; truckload operating margin ~ -2.3%), so
 * cost-per-mile and operating ratio are the numbers a 1-20 truck owner lives by.
 *
 * Cost basis here matches the existing per-truck P&L (fuel + maintenance + other
 * tracked expenses); driver settlements are tracked separately, so CPM is labeled
 * "operating cost/mile" in the UI to stay honest about what's included.
 */
export interface FleetKpiInput {
  revenueCents: number
  /** Operating costs we track per truck: fuel + maintenance + other expenses. */
  operatingCostCents: number
  loadedMiles: number
  deadheadMiles: number
}

export interface FleetKpis {
  revenueCents: number
  operatingCostCents: number
  netCents: number
  loadedMiles: number
  deadheadMiles: number
  totalMiles: number
  /** Operating cost per total mile, in cents. Null when no miles recorded. */
  cpmCents: number | null
  /** Revenue per loaded mile, in cents. Null when no loaded miles. */
  rpmCents: number | null
  /** Operating ratio = cost / revenue, as a percent (lower is better; <100 is profitable). */
  operatingRatioPct: number | null
  /** Net margin = net / revenue, as a percent. */
  marginPct: number | null
  /** Deadhead share = deadhead / total miles, as a percent. */
  deadheadPct: number | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function computeFleetKpis(input: FleetKpiInput): FleetKpis {
  const revenueCents = Math.round(input.revenueCents)
  const operatingCostCents = Math.round(input.operatingCostCents)
  const loadedMiles = Math.max(0, input.loadedMiles)
  const deadheadMiles = Math.max(0, input.deadheadMiles)
  const totalMiles = loadedMiles + deadheadMiles
  const netCents = revenueCents - operatingCostCents

  return {
    revenueCents,
    operatingCostCents,
    netCents,
    loadedMiles,
    deadheadMiles,
    totalMiles,
    cpmCents: totalMiles > 0 ? Math.round(operatingCostCents / totalMiles) : null,
    rpmCents: loadedMiles > 0 ? Math.round(revenueCents / loadedMiles) : null,
    operatingRatioPct: revenueCents > 0 ? round1((operatingCostCents / revenueCents) * 100) : null,
    marginPct: revenueCents > 0 ? round1((netCents / revenueCents) * 100) : null,
    deadheadPct: totalMiles > 0 ? round1((deadheadMiles / totalMiles) * 100) : null,
  }
}
