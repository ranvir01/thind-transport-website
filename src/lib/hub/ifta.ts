import { randomUUID } from "crypto"
import { query, queryOne } from "./db"
import { computeIfta, quarterRange, lastCompletedQuarterKey, iftaDueDate, staleRateJurisdictions, type IftaResult } from "./ifta-core"
import { jurisdictionMilesFromPings } from "./geo"
import { logAudit } from "./audit"
import type { ComplianceEntry } from "./compliance"

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
  report: { rows?: IftaResult["rows"]; missingRates?: string[]; unknownJurisdictionGallons?: number }
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
  actor: { id: string; name: string },
  opts?: { allowRecomputeOfFinalized?: boolean }
): Promise<{ result: IftaResult; mileageSource: string; unknownJurisdictionGallons: number }> {
  // Recomputing upserts status back to 'draft' — a reviewed/filed quarter must
  // not be reset without explicit confirmation from the caller.
  const existing = await query<{ status: string }>(
    `SELECT status FROM hub.ifta_reports WHERE carrier_id = $1 AND quarter = $2`,
    [carrierId, quarter]
  )
  const currentStatus = existing[0]?.status
  if (
    (currentStatus === "reviewed" || currentStatus === "filed") &&
    !opts?.allowRecomputeOfFinalized
  ) {
    throw new Error(
      `Quarter ${quarter} is already ${currentStatus} — recomputing resets it to draft. Confirm the recompute to proceed.`
    )
  }

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

  // 3. Tax-paid gallons by jurisdiction — TRACTOR FUEL ONLY. Reefer fuel is
  // not propulsion fuel: it is IFTA-exempt and excluded from tax-paid gallons
  // and fleet MPG (DEF/additives are not motor fuel at all).
  const fuel = await query<{ jurisdiction: string; gallons: string }>(
    `SELECT COALESCE(jurisdiction, '??') AS jurisdiction, SUM(gallons) AS gallons
     FROM hub.fuel_transactions
     WHERE carrier_id = $1 AND ts >= $2 AND ts < $3 AND fuel_use = 'tractor'
     GROUP BY COALESCE(jurisdiction, '??')`,
    [carrierId, start.toISOString(), end.toISOString()]
  )
  // Gallons with no state can't be credited to any jurisdiction, so they're
  // excluded from tax-paid gallons AND fleet MPG — which inflates MPG and
  // understates taxable gallons. Track the total so the worksheet can surface
  // it instead of silently filing on incomplete fuel data.
  const gallonsByJurisdiction: Record<string, number> = {}
  let unknownJurisdictionGallons = 0
  for (const row of fuel) {
    if (row.jurisdiction === "??") unknownJurisdictionGallons += Number(row.gallons)
    else gallonsByJurisdiction[row.jurisdiction] = Number(row.gallons)
  }
  unknownJurisdictionGallons = Math.round(unknownJurisdictionGallons * 1000) / 1000

  // Rates for the quarter (per-carrier since migration 016)
  const rateRows = await query<{ jurisdiction: string; rate: string; surcharge_rate: string }>(
    `SELECT jurisdiction, rate, surcharge_rate FROM hub.ifta_tax_rates WHERE carrier_id = $1 AND quarter = $2`,
    [carrierId, quarter]
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
      JSON.stringify({ rows: result.rows, missingRates: result.missingRates, unknownJurisdictionGallons }),
    ]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "ifta_report", entityId: quarter, action: "compute",
    newValue: { runId, mileageSource, netTaxCents: result.netTaxCents, unknownJurisdictionGallons },
  })

  return { result, mileageSource, unknownJurisdictionGallons }
}

/**
 * Compliance-wall entries for the IFTA quarterly filing itself. CDL/truck/
 * trailer expiries surface on the wall automatically, but a carrier who never
 * opened /hub/compliance/ifta got no signal that a quarter was unfiled.
 *
 * One entry always exists for the most recently completed quarter (the filing
 * currently due): amber until filed, red once the due date passes, green once
 * its report is marked filed. Older quarters appear only when a report was
 * started (draft/reviewed) and never marked filed — quarters before the
 * carrier onboarded stay off the wall.
 */
export function iftaFilingWallEntries(
  reports: { quarter: string; status: "draft" | "reviewed" | "filed" }[],
  now: Date
): ComplianceEntry[] {
  const currentQuarter = lastCompletedQuarterKey(now)
  const statusByQuarter = new Map(reports.map((r) => [r.quarter, r.status]))
  const quarters = new Set<string>([currentQuarter])
  for (const report of reports) {
    // "2025Q4" < "2026Q1" holds lexicographically for YYYYQN keys.
    if (report.status !== "filed" && report.quarter <= currentQuarter) quarters.add(report.quarter)
  }

  const entries: ComplianceEntry[] = []
  for (const quarter of [...quarters].sort()) {
    const due = iftaDueDate(quarter)
    const filed = statusByQuarter.get(quarter) === "filed"
    const color: ComplianceEntry["color"] = filed
      ? "green"
      : due < now
        ? "red"
        : due.getTime() - now.getTime() < 30 * 86400000
          ? "amber"
          : "green"
    entries.push({
      entity: "company",
      entityId: null,
      name: "Company",
      kind: `IFTA filing ${quarter}`,
      due: due.toISOString().slice(0, 10),
      color,
      href: `/hub/compliance/ifta?q=${quarter}`,
    })
  }
  return entries
}

export async function iftaFilingComplianceEntries(carrierId: string): Promise<ComplianceEntry[]> {
  const reports = await query<{ quarter: string; status: "draft" | "reviewed" | "filed" }>(
    `SELECT quarter, status FROM hub.ifta_reports WHERE carrier_id = $1`,
    [carrierId]
  )
  return iftaFilingWallEntries(reports, new Date())
}

export async function setIftaStatus(
  carrierId: string,
  quarter: string,
  status: "draft" | "reviewed" | "filed",
  actor: { id: string; name: string }
): Promise<void> {
  // Status is meaningless without a computed report — without this check the
  // UPDATE matches nothing yet an audit row still claims the status changed.
  const existing = await queryOne<{
    report: { rows?: IftaResult["rows"]; missingRates?: string[] } | null
  }>(
    `SELECT report FROM hub.ifta_reports WHERE carrier_id = $1 AND quarter = $2`,
    [carrierId, quarter]
  )
  if (!existing) {
    throw new Error(`No report computed for ${quarter} — compute the quarter first.`)
  }
  // Missing rates zero out those jurisdictions' lines (see computeIfta), so a
  // filing with them is materially understated — resolve before marking filed.
  const missingRates = existing.report?.missingRates ?? []
  if (status === "filed" && missingRates.length > 0) {
    throw new Error(
      `Cannot mark ${quarter} filed — missing tax rates for ${missingRates.join(", ")}. Import rates and recompute first.`
    )
  }
  // Rates re-imported AFTER the compute leave the report's lines priced on
  // superseded rates with missingRates empty — the filing would transcribe
  // numbers no longer backed by the rates on file.
  if (status === "filed") {
    const rateRows = await query<{ jurisdiction: string; rate: string; surcharge_rate: string }>(
      `SELECT jurisdiction, rate, surcharge_rate FROM hub.ifta_tax_rates WHERE carrier_id = $1 AND quarter = $2`,
      [carrierId, quarter]
    )
    const onFile: Record<string, { rate: number; surchargeRate?: number }> = {}
    for (const row of rateRows) {
      onFile[row.jurisdiction] = { rate: Number(row.rate), surchargeRate: Number(row.surcharge_rate) || undefined }
    }
    const stale = staleRateJurisdictions(existing.report?.rows ?? [], onFile)
    if (stale.length > 0) {
      throw new Error(
        `Cannot mark ${quarter} filed — rates on file for ${stale.join(", ")} changed after this report was computed. Recompute first.`
      )
    }
  }
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
  carrierId: string,
  rows: { jurisdiction: string; rate: number; surchargeRate: number }[],
  quarter: string,
  actor: { id: string; name: string }
): Promise<number> {
  let count = 0
  for (const row of rows) {
    await query(
      `INSERT INTO hub.ifta_tax_rates (carrier_id, jurisdiction, quarter, rate, surcharge_rate)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (carrier_id, jurisdiction, quarter) DO UPDATE SET rate = $4, surcharge_rate = $5`,
      [carrierId, row.jurisdiction.toUpperCase(), quarter, row.rate, row.surchargeRate]
    )
    count++
  }
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "ifta_rates", entityId: quarter, action: "import",
    newValue: { count, jurisdictions: rows.map((r) => r.jurisdiction.toUpperCase()) },
  })
  return count
}

export async function listIftaRates(carrierId: string, quarter: string) {
  return query<{ jurisdiction: string; rate: string; surcharge_rate: string }>(
    `SELECT jurisdiction, rate, surcharge_rate FROM hub.ifta_tax_rates
     WHERE carrier_id = $1 AND quarter = $2 ORDER BY jurisdiction`,
    [carrierId, quarter]
  )
}

/** 4-year-audit source export: pings + fuel for a quarter as CSV strings. */
export async function exportIftaSources(carrierId: string, quarter: string): Promise<{ pingsCsv: string; fuelCsv: string }> {
  const { start, end } = quarterRange(quarter)
  const pings = await query<{ unit_number: string; ts: string; lat: number; lng: number; odometer: string | null }>(
    `SELECT t.unit_number, p.ts, p.lat, p.lng, p.odometer
     FROM hub.position_pings p JOIN hub.trucks t ON t.id = p.truck_id AND t.carrier_id = p.carrier_id
     WHERE p.carrier_id = $1 AND p.ts >= $2 AND p.ts < $3 ORDER BY t.unit_number, p.ts`,
    [carrierId, start.toISOString(), end.toISOString()]
  )
  const fuel = await query<{ unit_number: string | null; ts: string; jurisdiction: string | null; gallons: string; fuel_use: string; total_cents: number; merchant: string | null }>(
    `SELECT t.unit_number, f.ts, f.jurisdiction, f.gallons, f.fuel_use, f.total_cents, f.merchant
     FROM hub.fuel_transactions f LEFT JOIN hub.trucks t ON t.id = f.truck_id AND t.carrier_id = f.carrier_id
     WHERE f.carrier_id = $1 AND f.ts >= $2 AND f.ts < $3 ORDER BY f.ts`,
    [carrierId, start.toISOString(), end.toISOString()]
  )
  const pingsCsv = [
    "unit,timestamp,lat,lng,odometer",
    ...pings.map((p) => `${p.unit_number},${new Date(p.ts).toISOString()},${p.lat},${p.lng},${p.odometer ?? ""}`),
  ].join("\n")
  const fuelCsv = [
    "unit,timestamp,jurisdiction,gallons,fuel_use,total_usd,merchant",
    ...fuel.map((f) => `${f.unit_number ?? ""},${new Date(f.ts).toISOString()},${f.jurisdiction ?? ""},${f.gallons},${f.fuel_use},${(f.total_cents / 100).toFixed(2)},"${(f.merchant ?? "").replace(/"/g, '""')}"`),
  ].join("\n")
  return { pingsCsv, fuelCsv }
}
