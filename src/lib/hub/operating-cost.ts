/**
 * The carrier's own cost per mile, measured — the number
 * carrier_settings.costPerMileCents is supposed to approximate.
 *
 * costPerMileCents is an all-in planning assumption: the dispatch board prices
 * a load's margin as `revenue - miles × costPerMileCents`, and lanes.ts ranks
 * every lane by it. It shipped as a hardcoded 185¢ with no screen to change it
 * and nothing to check it against, so every margin in the product rested on a
 * constant nobody had ever compared to reality.
 *
 * This composes what already exists rather than adding a third cost query:
 * truckPnlRange for fuel/maintenance/tolls/other and the miles,
 * driverPayCentsForRange for payroll, computeFleetKpis for the arithmetic.
 * Driver pay is roughly half a small carrier's cost per mile, so a "measured"
 * figure without it would be worse than no figure — it would read low and
 * confirm the assumption that is already too low.
 */
import { truckPnlRange, driverPayCentsForRange, type PnlRange } from "./reports"
import { computeFleetKpis } from "./kpi"
import { getCarrierSettings } from "./settings"

export interface MeasuredOperatingCost {
  /** All-in (operating + driver pay) cents per total mile. Null when unmeasurable. */
  allInCpmCents: number | null
  /** Operating only — fuel, maintenance, tolls, other expenses. */
  operatingCpmCents: number | null
  /** What the product is currently assuming. */
  configuredCpmCents: number
  /** allIn - configured. Positive means the assumption flatters every margin. */
  varianceCents: number | null
  loadedMiles: number
  deadheadMiles: number
  totalMiles: number
  /**
   * False when no payroll is measurable in range — no settlements, or
   * settlements whose earning lines total zero. The all-in figure is then null.
   */
  hasDriverPay: boolean
  /** Loads whose deadhead was never filled in; miles below are understated by them. */
  deadheadBlankLoads: number
  range: PnlRange
}

export async function measuredOperatingCost(
  carrierId: string,
  range: PnlRange
): Promise<MeasuredOperatingCost> {
  const [pnl, driverPayCents, settings] = await Promise.all([
    truckPnlRange(carrierId, range),
    driverPayCentsForRange(carrierId, range),
    getCarrierSettings(carrierId),
  ])

  const loadedMiles = pnl.reduce((s, r) => s + Number(r.loaded_miles ?? 0), 0)
  const deadheadMiles = pnl.reduce((s, r) => s + Number(r.deadhead_miles ?? 0), 0)
  const deadheadBlankLoads = pnl.reduce((s, r) => s + Number(r.deadhead_missing_loads ?? 0), 0)
  const operatingCostCents = pnl.reduce(
    (s, r) =>
      s + Number(r.fuel_cents) + Number(r.maintenance_cents) + Number(r.toll_cents) + Number(r.other_expense_cents),
    0
  )
  const revenueCents = pnl.reduce((s, r) => s + Number(r.revenue_cents), 0)

  // driverPayCentsForRange returns null when there are NO settlements in range,
  // but 0 when settlements exist whose earning lines total nothing. Both mean
  // the same thing here: no payroll signal. Passing 0 through would make the
  // all-in figure identical to the operating one and present it as all-in —
  // the exact "payroll cost nothing" reading that function's own contract
  // forbids, and it would understate the true cost per mile by roughly half.
  const payrollSignal = driverPayCents != null && driverPayCents > 0 ? driverPayCents : null

  const kpis = computeFleetKpis({
    revenueCents,
    operatingCostCents,
    driverPayCents: payrollSignal,
    loadedMiles,
    deadheadMiles,
  })

  const configuredCpmCents = settings.costPerMileCents
  return {
    allInCpmCents: kpis.allInCpmCents,
    operatingCpmCents: kpis.cpmCents,
    configuredCpmCents,
    varianceCents: kpis.allInCpmCents == null ? null : kpis.allInCpmCents - configuredCpmCents,
    loadedMiles,
    deadheadMiles,
    totalMiles: kpis.totalMiles,
    hasDriverPay: payrollSignal != null,
    deadheadBlankLoads,
    range,
  }
}
