import { randomUUID } from "crypto"
import { query, queryOne } from "./db"
import { computeIfta, quarterRange, type IftaResult } from "./ifta-core"
import { jurisdictionMilesFromPings } from "./geo"
import { logAudit } from "./audit"

export interface IftaReportRecord {
  id: string
  quarter: string
  status: "draft" | "reviewed" | "filed"
  run_id: string | null
  mileage_source: string | null
  fleet_miles: string | null
  fleet_gallons: string | null
  mpg: string | null
  net_tax_cents: number | null
  report: { rows?: IftaResult["rows"]; missingRates?: string[] }
  updated_at: string
}

export async function listIftaReports(carrierId: string): Promise<IftaReportRecord[]> {
  return query<IftaReportRecord>(
    `SELECT * FROM hub.ifta_reports WHERE carrier_id = $1 ORDER BY quarter DESC`,
    [carrierId]
  )
}

export async function getIftaReport(carrierId: string, quarter: string): Promise<IftaReportRecord | null> {
  return queryOne<IftaReportRecord>(
    `SELECT * FROM hub.ifta_reports WHERE carrier_id = $1 AND quarter = $2`,
    [carrierId, quarter]
  )
}

/**
 * Compute (or recompute) a quarter:
 * 1. Prefer GPS pings → jurisdiction miles (per truck) under a fresh run id.
 * 2. Fall back to imported jurisdiction miles (TruckX CSV path) when no pings.
 * 3. Combine with tax-paid gallons from fuel transactions; apply rates.
 * Recomputation creates a new run id — prior runs are never edited.
 */
export async function computeIftaQuarter(
  carrierId: string,
  quarter: string,
  actor: { id: string; name: string }
): Promise<{ result: IftaResult; mileageSource: string }> {
  const { start, end } = quarterRange(quarter)
  const runId = randomUUID()

  // 1. Pings in the quarter, grouped by truck
  const trucks = await query<{ truck_id: string }>(
    `SELECT DISTINCT truck_id FROM hub.position_pings
     WHERE carrier_id = $1 AND ts >= $2 AND ts < $3`,
    [carrierId, start.toISOString(), end.toISOString()]
  )

  let mileageSource = "pings"
  const milesByJurisdiction: Record<string, number> = {}

  if (trucks.length > 0) {
    for (const { truck_id } of trucks) {
      const pings = await query<{ lat: number; lng: number; ts: string }>(
        `SELECT lat, lng, ts FROM hub.position_pings
         WHERE carrier_id = $1 AND truck_id = $2 AND ts >= $3 AND ts < $4
         ORDER BY ts ASC`,
        [carrierId, truck_id, start.toISOString(), end.toISOString()]
      )
      const perTruck = jurisdictionMilesFromPings(pings)
      for (const [jurisdiction, miles] of Object.entries(perTruck)) {
        milesByJurisdiction[jurisdiction] = (milesByJurisdiction[jurisdiction] ?? 0) + miles
        await query(
          `INSERT INTO hub.jurisdiction_miles (carrier_id, run_id, truck_id, quarter, jurisdiction, miles, source)
           VALUES ($1,$2,$3,$4,$5,$6,'pings')`,
          [carrierId, runId, truck_id, quarter, jurisdiction, miles]
        )
      }
    }
  } else {
    // 2. Imported mileage path (universal importer writes source='import')
    mileageSource = "import"
    const imported = await query<{ jurisdiction: string; miles: string }>(
      `SELECT jurisdiction, SUM(miles) AS miles FROM hub.jurisdiction_miles
       WHERE carrier_id = $1 AND quarter = $2 AND source = 'import'
       GROUP BY jurisdiction`,
      [carrierId, quarter]
    )
    for (const row of imported) {
      milesByJurisdiction[row.jurisdiction] = Number(row.miles)
    }
  }

  // 3. Tax-paid gallons by jurisdiction
  const fuel = await query<{ jurisdiction: string; gallons: string }>(
    `SELECT COALESCE(jurisdiction, '??') AS jurisdiction, SUM(gallons) AS gallons
     FROM hub.fuel_transactions
     WHERE carrier_id = $1 AND ts >= $2 AND ts < $3
     GROUP BY COALESCE(jurisdiction, '??')`,
    [carrierId, start.toISOString(), end.toISOString()]
  )
  const gallonsByJurisdiction: Record<string, number> = {}
  for (const row of fuel) {
    if (row.jurisdiction !== "??") gallonsByJurisdiction[row.jurisdiction] = Number(row.gallons)
  }

  // Rates for the quarter
  const rateRows = await query<{ jurisdiction: string; rate: string; surcharge_rate: string }>(
    `SELECT jurisdiction, rate, surcharge_rate FROM hub.ifta_tax_rates WHERE quarter = $1`,
    [quarter]
  )
  const rates: Record<string, { rate: number; surchargeRate?: number }> = {}
  for (const row of rateRows) {
    rates[row.jurisdiction] = { rate: Number(row.rate), surchargeRate: Number(row.surcharge_rate) || undefined }
  }

  const result = computeIfta({ milesByJurisdiction, gallonsByJurisdiction, rates })

  await query(
    `INSERT INTO hub.ifta_reports (carrier_id, quarter, status, run_id, mileage_source, fleet_miles, fleet_gallons, mpg, net_tax_cents, report)
     VALUES ($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (carrier_id, quarter) DO UPDATE SET
       status = 'draft', run_id = $3, mileage_source = $4, fleet_miles = $5,
       fleet_gallons = $6, mpg = $7, net_tax_cents = $8, report = $9, updated_at = NOW()`,
    [
      carrierId, quarter, runId, mileageSource,
      result.fleetMiles, result.fleetGallons, result.mpg, result.netTaxCents,
      JSON.stringify({ rows: result.rows, missingRates: result.missingRates }),
    ]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "ifta_report", entityId: quarter, action: "compute",
    newValue: { runId, mileageSource, netTaxCents: result.netTaxCents },
  })

  return { result, mileageSource }
}

export async function setIftaStatus(
  carrierId: string,
  quarter: string,
  status: "draft" | "reviewed" | "filed",
  actor: { id: string; name: string }
): Promise<void> {
  await query(
    `UPDATE hub.ifta_reports SET status = $3, updated_at = NOW() WHERE carrier_id = $1 AND quarter = $2`,
    [carrierId, quarter, status]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "ifta_report", entityId: quarter, action: `status:${status}`,
  })
}

/** Replace rates for a quarter from pasted iftach.org-style CSV (JUR,rate,surcharge). */
export async function importIftaRates(
  rows: { jurisdiction: string; rate: number; surchargeRate: number }[],
  quarter: string
): Promise<number> {
  let count = 0
  for (const row of rows) {
    await query(
      `INSERT INTO hub.ifta_tax_rates (jurisdiction, quarter, rate, surcharge_rate)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (jurisdiction, quarter) DO UPDATE SET rate = $3, surcharge_rate = $4`,
      [row.jurisdiction.toUpperCase(), quarter, row.rate, row.surchargeRate]
    )
    count++
  }
  return count
}

export async function listIftaRates(quarter: string) {
  return query<{ jurisdiction: string; rate: string; surcharge_rate: string }>(
    `SELECT jurisdiction, rate, surcharge_rate FROM hub.ifta_tax_rates WHERE quarter = $1 ORDER BY jurisdiction`,
    [quarter]
  )
}

/** 4-year-audit source export: pings + fuel for a quarter as CSV strings. */
export async function exportIftaSources(carrierId: string, quarter: string): Promise<{ pingsCsv: string; fuelCsv: string }> {
  const { start, end } = quarterRange(quarter)
  const pings = await query<{ unit_number: string; ts: string; lat: number; lng: number; odometer: string | null }>(
    `SELECT t.unit_number, p.ts, p.lat, p.lng, p.odometer
     FROM hub.position_pings p JOIN hub.trucks t ON t.id = p.truck_id
     WHERE p.carrier_id = $1 AND p.ts >= $2 AND p.ts < $3 ORDER BY t.unit_number, p.ts`,
    [carrierId, start.toISOString(), end.toISOString()]
  )
  const fuel = await query<{ unit_number: string | null; ts: string; jurisdiction: string | null; gallons: string; total_cents: number; merchant: string | null }>(
    `SELECT t.unit_number, f.ts, f.jurisdiction, f.gallons, f.total_cents, f.merchant
     FROM hub.fuel_transactions f LEFT JOIN hub.trucks t ON t.id = f.truck_id
     WHERE f.carrier_id = $1 AND f.ts >= $2 AND f.ts < $3 ORDER BY f.ts`,
    [carrierId, start.toISOString(), end.toISOString()]
  )
  const pingsCsv = [
    "unit,timestamp,lat,lng,odometer",
    ...pings.map((p) => `${p.unit_number},${new Date(p.ts).toISOString()},${p.lat},${p.lng},${p.odometer ?? ""}`),
  ].join("\n")
  const fuelCsv = [
    "unit,timestamp,jurisdiction,gallons,total_usd,merchant",
    ...fuel.map((f) => `${f.unit_number ?? ""},${new Date(f.ts).toISOString()},${f.jurisdiction ?? ""},${f.gallons},${(f.total_cents / 100).toFixed(2)},"${(f.merchant ?? "").replace(/"/g, '""')}"`),
  ].join("\n")
  return { pingsCsv, fuelCsv }
}
