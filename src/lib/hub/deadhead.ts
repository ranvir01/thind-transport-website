/**
 * Measured deadhead (AGENT_TASKS Wave 1, Task 1 / TOP_10 #3).
 *
 * deadhead_miles on a load is free text a dispatcher types — nothing derives
 * or validates it (in the demo seed it is literally miles × 0.08 on all 27
 * loads, so a dashboard reading ~7% is reporting a constant). This module
 * builds a MEASURED figure from an instrument the carrier already has: fuel
 * card rows. gallons × fleet MPG = total miles driven; minus the loads'
 * loaded miles = empty miles. No ELD, no credential, no integration.
 *
 * The measured number renders NEXT TO the typed one, never instead of it —
 * the whole point is that the owner sees the two disagree. Integer miles
 * throughout; percentages to one decimal.
 *
 * Blind spots, so confidence is explicit:
 *  - fuel bought in the window vs loads delivered in the window are only
 *    approximately the same trucks-and-days; short windows wobble.
 *  - a truck fueling on a personal card, or rows missing fuel_use='tractor'
 *    classification, undercount gallons → measured total can fall BELOW the
 *    loads' own loaded miles. That is physically impossible, so it flags the
 *    estimate as thin rather than reporting negative empty miles.
 */
import { query } from "./db"
import { getCarrierSettings } from "./settings"

export type DeadheadBasis = "fuel" | "none"
export type DeadheadConfidence = "good" | "thin" | "none"

export interface DeadheadInputs {
  typedDeadheadMiles: number
  loadedMiles: number
  /** Propulsion fuel only (fuel_use = 'tractor'; reefer/DEF excluded, same rule as IFTA). */
  tractorGallons: number
  mpg: number
  fuelRows: number
}

export interface DeadheadEstimate {
  typedDeadheadMiles: number
  typedDeadheadPct: number | null
  measuredTotalMiles: number | null
  measuredEmptyMiles: number | null
  measuredDeadheadPct: number | null
  basis: DeadheadBasis
  confidence: DeadheadConfidence
}

/** Fewer fuel rows than this in the window → the sample is too thin to lean on. */
const MIN_FUEL_ROWS_FOR_CONFIDENCE = 8

const pct1 = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : null

export function deadheadFromFuel(input: DeadheadInputs): DeadheadEstimate {
  const typed = Math.max(0, Math.round(input.typedDeadheadMiles))
  const loaded = Math.max(0, Math.round(input.loadedMiles))
  const typedPct = pct1(typed, loaded + typed)

  if (input.tractorGallons <= 0 || input.mpg <= 0) {
    return {
      typedDeadheadMiles: typed,
      typedDeadheadPct: typedPct,
      measuredTotalMiles: null,
      measuredEmptyMiles: null,
      measuredDeadheadPct: null,
      basis: "none",
      confidence: "none",
    }
  }

  const measuredTotal = Math.round(input.tractorGallons * input.mpg)
  // Fuel says fewer total miles than the loads claim loaded: the fuel data is
  // incomplete for this window, not the trucks levitating. Floor at zero and
  // mark thin.
  const fuelUndercounts = measuredTotal < loaded
  const measuredEmpty = Math.max(0, measuredTotal - loaded)

  return {
    typedDeadheadMiles: typed,
    typedDeadheadPct: typedPct,
    measuredTotalMiles: measuredTotal,
    measuredEmptyMiles: measuredEmpty,
    measuredDeadheadPct: pct1(measuredEmpty, measuredTotal),
    basis: "fuel",
    confidence:
      fuelUndercounts || input.fuelRows < MIN_FUEL_ROWS_FOR_CONFIDENCE ? "thin" : "good",
  }
}

// ---- Carrier-scoped report ----

export interface TruckDeadheadRow {
  truckId: string
  truckUnit: string
  loadedMiles: number
  gallons: number
  fuelRows: number
  estimate: DeadheadEstimate
}

export interface DeadheadReport {
  fleet: DeadheadEstimate
  /** Sorted worst measured-deadhead first; the fleet number hides which truck runs empty. */
  trucks: TruckDeadheadRow[]
  mpg: number
}

interface LoadAgg {
  truck_id: string | null
  truck_unit: string | null
  loaded_miles: string
  deadhead_miles: string
}
interface FuelAgg {
  truck_id: string | null
  gallons: string
  rows: string
}

/** from/to are date-only ISO strings, to-inclusive (same contract as the P&L range). */
export async function getDeadheadReport(
  carrierId: string,
  range: { from: string; to: string }
): Promise<DeadheadReport> {
  const [loadRows, fuelRows, settings] = await Promise.all([
    query<LoadAgg>(
      // Windowed on the delivery stamp with created_at as the pre-022
      // fallback, so legacy rows still land in a range.
      `SELECT l.truck_id, t.unit AS truck_unit,
         COALESCE(SUM(l.loaded_miles), 0) AS loaded_miles,
         COALESCE(SUM(l.deadhead_miles), 0) AS deadhead_miles
       FROM hub.loads l
       LEFT JOIN hub.trucks t ON t.id = l.truck_id AND t.carrier_id = l.carrier_id
       WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
         AND l.status IN ('delivered', 'pod_received', 'invoiced', 'paid', 'settled')
         AND COALESCE(l.delivered_at, l.created_at) >= $2::date
         AND COALESCE(l.delivered_at, l.created_at) < ($3::date + INTERVAL '1 day')
       GROUP BY l.truck_id, t.unit`,
      [carrierId, range.from, range.to]
    ),
    query<FuelAgg>(
      `SELECT truck_id, COALESCE(SUM(gallons), 0) AS gallons, COUNT(*) AS rows
       FROM hub.fuel_transactions
       WHERE carrier_id = $1 AND fuel_use = 'tractor'
         AND ts >= $2::date AND ts < ($3::date + INTERVAL '1 day')
       GROUP BY truck_id`,
      [carrierId, range.from, range.to]
    ),
    getCarrierSettings(carrierId),
  ])

  const mpg = settings.fsc.mpg
  const fuelByTruck = new Map(fuelRows.map((f) => [f.truck_id ?? "", f]))

  let fleetTyped = 0
  let fleetLoaded = 0
  let fleetGallons = 0
  let fleetFuelRows = 0

  const trucks: TruckDeadheadRow[] = []
  for (const row of loadRows) {
    const fuel = fuelByTruck.get(row.truck_id ?? "")
    const gallons = Number(fuel?.gallons ?? 0)
    const rows = Number(fuel?.rows ?? 0)
    const loaded = Number(row.loaded_miles)
    const typed = Number(row.deadhead_miles)
    fleetTyped += typed
    fleetLoaded += loaded
    if (row.truck_id) {
      trucks.push({
        truckId: row.truck_id,
        truckUnit: row.truck_unit ?? "—",
        loadedMiles: Math.round(loaded),
        gallons: Math.round(gallons * 10) / 10,
        fuelRows: rows,
        estimate: deadheadFromFuel({
          typedDeadheadMiles: typed,
          loadedMiles: loaded,
          tractorGallons: gallons,
          mpg,
          fuelRows: rows,
        }),
      })
    }
  }
  // Fuel bought by trucks with no delivered load in the window still counts
  // toward the fleet's total (that fuel moved a truck somewhere — likely empty).
  for (const f of fuelRows) {
    fleetGallons += Number(f.gallons)
    fleetFuelRows += Number(f.rows)
  }

  trucks.sort(
    (a, b) => (b.estimate.measuredDeadheadPct ?? -1) - (a.estimate.measuredDeadheadPct ?? -1)
  )

  return {
    fleet: deadheadFromFuel({
      typedDeadheadMiles: fleetTyped,
      loadedMiles: fleetLoaded,
      tractorGallons: fleetGallons,
      mpg,
      fuelRows: fleetFuelRows,
    }),
    trucks,
    mpg,
  }
}
