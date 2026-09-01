/**
 * Driver-app data layer: everything is scoped to the signed-in driver.
 * Drivers never see margins, other drivers' loads, or office-only data —
 * enforced here at the query layer, not in the UI.
 */
import path from "path"
import { query, queryOne } from "./db"
import { getActivePayRules } from "./pay-rules-db"
import { evaluatePayRules, summarizePayRules, type PayLoadContext } from "./pay-rules"
import type { Load, Stop, Settlement, SettlementLine, HubDocument, DocumentRequest } from "./types"

/** Status taps the driver may perform (forward-only, their own load). */
export const DRIVER_STATUS_FLOW: Record<string, string> = {
  dispatched: "at_pickup",
  at_pickup: "in_transit",
  in_transit: "delivered",
}

/**
 * Deliberately NOT `extends Load`.
 *
 * The header above promises drivers never see margins "at the query layer, not
 * in the UI". That was not true: the query was `SELECT l.*`, and the whole row
 * is handed to DriverLoadCard, a client component — so `linehaul_cents` and
 * `fuel_surcharge_cents` rode into the page payload on the driver's phone.
 * Nothing rendered them, which is the kind of guarantee that holds right up
 * until someone adds a field to a card.
 *
 * So this lists exactly what the driver app renders, and the SELECT below
 * matches it. What the driver EARNS is computed separately by driverRunPay,
 * which reads the money server-side and returns only their own figure.
 */
export interface DriverLoad {
  id: string
  reference: string
  status: string
  commodity: string | null
  equipment: string
  notes: string | null
  acknowledged_at: string | null
  customer_name?: string | null
  truck_unit?: string | null
  trailer_unit?: string | null
  doc_kinds?: string[] | null
  stops?: Stop[]
}

/* ------------------------------ what it pays ------------------------------ */

/**
 * What a run is worth to the driver, through the REAL pay engine.
 *
 * A driver could see commodity, equipment, stops and appointment windows — and
 * not the miles, let alone the money. The only pay on the phone was a settled
 * one, which meant nothing between delivering on Tuesday and payroll on Friday.
 *
 * This runs `evaluatePayRules` — the same function that drafts settlements —
 * over one load at a time, so the figure on the phone is the figure the
 * software would actually pay. A second implementation here would drift the
 * first time somebody edited a pay rule, and the driver would be the last to
 * find out.
 *
 * Gross, not net: escrow and insurance are period deductions a single run did
 * not cause, and subtracting them from one load would read as a fine for
 * working. Returns nothing at all — never a guess — for a driver with no
 * active rule set.
 *
 * The money columns are read HERE, on the server, and only the driver's own
 * number is returned. `driverActiveLoads` deliberately does not select them.
 */
export interface RunPay {
  cents: number
  /** The engine's own words, e.g. "BRH-2033 — 412 mi × $0.58/mi". */
  label: string
}

export async function driverRunPay(
  carrierId: string,
  driverId: string,
  loadIds: string[]
): Promise<Map<string, RunPay>> {
  const out = new Map<string, RunPay>()
  if (loadIds.length === 0) return out
  const ruleSet = await getActivePayRules(carrierId, driverId)
  if (!ruleSet) return out

  const rows = await query<{
    id: string; reference: string; linehaul_cents: number; fuel_surcharge_cents: number
    accessorial_cents: number; loaded_miles: number; deadhead_miles: number; stops_count: number
  }>(
    `SELECT l.id, l.reference, l.linehaul_cents, l.fuel_surcharge_cents,
            COALESCE((SELECT SUM((a->>'amount_cents')::int)
                        FROM jsonb_array_elements(l.accessorials) a), 0)::int AS accessorial_cents,
            COALESCE(l.loaded_miles, 0) AS loaded_miles,
            COALESCE(l.deadhead_miles, 0) AS deadhead_miles,
            (SELECT COUNT(*)::int FROM hub.stops s
              WHERE s.carrier_id = $1 AND s.load_id = l.id) AS stops_count
       FROM hub.loads l
      WHERE l.carrier_id = $1 AND l.driver_id = $2 AND l.deleted_at IS NULL
        AND l.id = ANY($3::uuid[])`,
    [carrierId, driverId, loadIds]
  )

  for (const row of rows) {
    const ctx: PayLoadContext = {
      id: row.id,
      reference: row.reference,
      linehaulCents: row.linehaul_cents,
      fuelSurchargeCents: row.fuel_surcharge_cents,
      accessorialCents: row.accessorial_cents,
      loadedMiles: row.loaded_miles,
      deadheadMiles: row.deadhead_miles,
      stopsCount: row.stops_count,
    }
    const draft = evaluatePayRules(ruleSet, {
      loads: [ctx],
      reimbursements: [],
      outstandingAdvances: [],
    })
    if (draft.grossCents <= 0) continue
    const earnings = draft.lines.filter((l) => l.kind === "earning")
    // The figure shown is the GROSS across every earning line, so the caption
    // beside it has to describe the same thing. A single line can speak for
    // itself — the engine already writes "410 mi × $0.58/mi". More than one and
    // it cannot: an owner-operator on 90% of linehaul PLUS a fuel-surcharge
    // passthrough would have read "$513.70 · 90% of $503.00", which is not what
    // 90% of $503 is, and is exactly the sort of arithmetic a driver checks.
    // Fall back to the rule set's own summary ("90% linehaul + 100% FSC"),
    // which describes the whole formula without asserting a false sum.
    const label =
      earnings.length === 1
        ? // strip the load reference the engine prefixes; the card already
          // says which load this is
          (earnings[0].label ?? "").replace(/^\S+\s+—\s+/, "")
        : summarizePayRules(ruleSet)
    out.set(row.id, { cents: draft.grossCents, label })
  }
  return out
}

/**
 * Delivered, and not on a settlement yet.
 *
 * `driverSettlements` only ever shows approved or paid runs, so a driver had no
 * way to see money that existed but had not been through payroll yet. This is
 * that gap, filled with the same engine so it can never disagree with Friday.
 *
 * `settlement_id IS NULL` is the whole rule, and deliberately the only one. The
 * first draft also required `delivered_at > MAX(period_end)`, which reads as a
 * sensible "since the last settlement" window and is in fact a way to hide
 * earned money: a carrier whose latest settlement period ends in the FUTURE
 * (the sandbox seeds exactly that) zeroes out every real unpaid load a driver
 * has. Jordan had three of them and his phone said nothing. A load that has
 * not been attached to a settlement has not been paid — no date arithmetic
 * needed, and any extra condition here can only ever subtract from a number
 * the driver is owed.
 */
export async function driverUnsettledPay(carrierId: string, driverId: string): Promise<number> {
  const ruleSet = await getActivePayRules(carrierId, driverId)
  if (!ruleSet) return 0

  const rows = await query<{
    id: string; reference: string; linehaul_cents: number; fuel_surcharge_cents: number
    accessorial_cents: number; loaded_miles: number; deadhead_miles: number; stops_count: number
  }>(
    `SELECT l.id, l.reference, l.linehaul_cents, l.fuel_surcharge_cents,
            COALESCE((SELECT SUM((a->>'amount_cents')::int)
                        FROM jsonb_array_elements(l.accessorials) a), 0)::int AS accessorial_cents,
            COALESCE(l.loaded_miles, 0) AS loaded_miles,
            COALESCE(l.deadhead_miles, 0) AS deadhead_miles,
            (SELECT COUNT(*)::int FROM hub.stops s
              WHERE s.carrier_id = $1 AND s.load_id = l.id) AS stops_count
       FROM hub.loads l
      WHERE l.carrier_id = $1 AND l.driver_id = $2 AND l.deleted_at IS NULL
        AND l.status IN ('delivered','pod_received','invoiced','paid')
        AND l.settlement_id IS NULL
      LIMIT 100`,
    [carrierId, driverId]
  )
  if (rows.length === 0) return 0

  const loads: PayLoadContext[] = rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    linehaulCents: row.linehaul_cents,
    fuelSurchargeCents: row.fuel_surcharge_cents,
    accessorialCents: row.accessorial_cents,
    loadedMiles: row.loaded_miles,
    deadheadMiles: row.deadhead_miles,
    stopsCount: row.stops_count,
  }))
  return evaluatePayRules(ruleSet, { loads, reimbursements: [], outstandingAdvances: [] }).grossCents
}

/** The driver's current/next loads with stops, facility notes ready to join. */
export async function driverActiveLoads(carrierId: string, driverId: string): Promise<DriverLoad[]> {
  const loads = await query<DriverLoad>(
    `SELECT l.id, l.reference, l.status, l.commodity, l.equipment, l.notes,
       l.acknowledged_at, l.created_at,
       c.name AS customer_name,
       t.unit_number AS truck_unit, tr.unit_number AS trailer_unit,
       docs.kinds AS doc_kinds
     FROM hub.loads l
     LEFT JOIN hub.customers c ON c.id = l.customer_id AND c.carrier_id = l.carrier_id
     LEFT JOIN hub.trucks t ON t.id = l.truck_id AND t.carrier_id = l.carrier_id
     LEFT JOIN hub.trailers tr ON tr.id = l.trailer_id AND tr.carrier_id = l.carrier_id
     LEFT JOIN LATERAL (
       SELECT ARRAY_AGG(DISTINCT d.kind) AS kinds FROM hub.documents d
       WHERE d.entity_type = 'load' AND d.entity_id = l.id AND d.carrier_id = l.carrier_id
     ) docs ON TRUE
     WHERE l.carrier_id = $1 AND l.driver_id = $2 AND l.deleted_at IS NULL
       AND l.status IN ('dispatched','at_pickup','in_transit','delivered')
     ORDER BY l.created_at ASC`,
    [carrierId, driverId]
  )
  for (const load of loads) {
    load.stops = await query<Stop>(
      `SELECT s.*, f.avg_dwell AS facility_avg_dwell, n.notes AS facility_notes
       FROM hub.stops s
       LEFT JOIN LATERAL (
         SELECT ROUND(AVG(EXTRACT(EPOCH FROM (x.departed_at - x.arrived_at)) / 60))::int AS avg_dwell
         FROM hub.stops x
         WHERE x.facility_id = s.facility_id AND x.carrier_id = s.carrier_id
           AND x.arrived_at IS NOT NULL AND x.departed_at IS NOT NULL
           AND x.departed_at > x.arrived_at AND s.facility_id IS NOT NULL
       ) f ON TRUE
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(jsonb_build_object(
                  'body', fn.body, 'tags', fn.tags, 'author', fn.author_name,
                  'role', fn.author_role) ORDER BY fn.created_at DESC) AS notes
         FROM (SELECT * FROM hub.facility_notes y
               WHERE y.facility_id = s.facility_id AND y.carrier_id = s.carrier_id
               ORDER BY y.created_at DESC LIMIT 3) fn
         WHERE s.facility_id IS NOT NULL
       ) n ON TRUE
       WHERE s.load_id = $1 AND s.carrier_id = $2 ORDER BY s.sequence`,
      [load.id, carrierId]
    )
  }
  return loads
}

/** Verify a load belongs to this driver before any driver action touches it. */
export async function driverOwnsLoad(
  carrierId: string,
  driverId: string,
  loadId: string
): Promise<{ id: string; status: string } | null> {
  return queryOne<{ id: string; status: string }>(
    `SELECT id, status FROM hub.loads
     WHERE carrier_id = $1 AND driver_id = $2 AND id = $3 AND deleted_at IS NULL`,
    [carrierId, driverId, loadId]
  )
}

export async function driverSettlements(
  carrierId: string,
  driverId: string,
  limit = 12
): Promise<Settlement[]> {
  return query<Settlement>(
    `SELECT s.* FROM hub.settlements s
     WHERE s.carrier_id = $1 AND s.driver_id = $2 AND s.status IN ('approved','paid')
     ORDER BY s.period_end DESC LIMIT $3`,
    [carrierId, driverId, limit]
  )
}

/** Line items for one of the driver's own settlements — guarded by driver_id, not just carrier_id. */
export async function driverSettlementLines(
  carrierId: string,
  driverId: string,
  settlementId: string
): Promise<SettlementLine[]> {
  return query<SettlementLine>(
    `SELECT sl.* FROM hub.settlement_lines sl
     JOIN hub.settlements s ON s.id = sl.settlement_id AND s.carrier_id = $1 AND s.driver_id = $2
     WHERE sl.settlement_id = $3 ORDER BY sl.kind, sl.created_at`,
    [carrierId, driverId, settlementId]
  )
}

/**
 * May this signed-in driver read this stored file?
 *
 * Same-carrier is NOT enough for a driver, exactly as it is not enough for a
 * broker/shipper (portalFileVisible). Until this existed, /api/hub/files/[name]
 * let any signed-in driver read every file their carrier owned — another
 * driver's CDL and medical-card scans, and every settlement statement in the
 * company — from a filename alone.
 *
 * The allowlist is the driver app's own surface, so this grants nothing the UI
 * does not already show them:
 *   - documents on loads assigned to them        (driverActiveLoads)
 *   - their own driver documents                 (driverDocuments)
 *   - their own approved/paid settlement PDFs    (driverSettlements)
 *
 * Note it does NOT filter load documents by kind, so a rate confirmation on
 * their own load stays readable — drivers are routinely sent theirs, and
 * driverActiveLoads already lists the kinds attached to each of their loads.
 * If rate visibility should be withheld from drivers, that is a product call:
 * add `AND d.kind <> 'rate_confirmation'` to the first branch.
 */
export async function driverFileVisible(
  carrierId: string,
  userId: string,
  fileName: string
): Promise<boolean> {
  const account = await queryOne<{ driver_id: string | null }>(
    `SELECT driver_id FROM hub.users
     WHERE id = $1 AND carrier_id = $2 AND role = 'driver' AND active`,
    [userId, carrierId]
  )
  if (!account?.driver_id) return false
  // Match both URL forms resolveHubFile accepts: the /api/hub/files/<name>
  // route form, and legacy rows still holding the absolute blob URL. Matching
  // only the first would 404 a driver's older PODs and statements.
  const safeName = path.basename(fileName)
  const url = `/api/hub/files/${safeName}`
  const legacySuffix = `/hub/${safeName}`
  const claim = await queryOne<{ ok: number }>(
    `SELECT 1 AS ok FROM hub.documents d
       JOIN hub.loads l ON l.id = d.entity_id AND d.entity_type = 'load' AND l.carrier_id = d.carrier_id
     WHERE (d.url = $1 OR (d.url LIKE 'https://%' AND right(d.url, $4::int) = $5::text))
       AND d.carrier_id = $2 AND l.driver_id = $3 AND l.deleted_at IS NULL
     UNION ALL
     SELECT 1 AS ok FROM hub.documents
     WHERE (url = $1 OR (url LIKE 'https://%' AND right(url, $4::int) = $5::text))
       AND carrier_id = $2 AND entity_type = 'driver' AND entity_id = $3
     UNION ALL
     SELECT 1 AS ok FROM hub.settlements
     WHERE (statement_url = $1 OR (statement_url LIKE 'https://%' AND right(statement_url, $4::int) = $5::text))
       AND carrier_id = $2 AND driver_id = $3 AND status IN ('approved','paid')
     LIMIT 1`,
    [url, carrierId, account.driver_id, legacySuffix.length, legacySuffix]
  )
  return Boolean(claim)
}

export async function driverDocuments(carrierId: string, driverId: string): Promise<HubDocument[]> {
  return query<HubDocument>(
    `SELECT * FROM hub.documents
     WHERE carrier_id = $1 AND entity_type = 'driver' AND entity_id = $2 ORDER BY created_at DESC`,
    [carrierId, driverId]
  )
}

export async function openDocumentRequests(
  carrierId: string,
  driverId: string
): Promise<DocumentRequest[]> {
  return query<DocumentRequest>(
    `SELECT r.*, l.reference AS load_reference
     FROM hub.document_requests r
     LEFT JOIN hub.loads l ON l.id = r.load_id AND l.carrier_id = r.carrier_id
     WHERE r.carrier_id = $1 AND r.driver_id = $2 AND r.status = 'open'
     ORDER BY r.created_at`,
    [carrierId, driverId]
  )
}

/** Pay summary for the home screen: last approved settlement net. */
export async function lastPay(carrierId: string, driverId: string): Promise<Settlement | null> {
  return queryOne<Settlement>(
    `SELECT * FROM hub.settlements
     WHERE carrier_id = $1 AND driver_id = $2 AND status IN ('approved','paid')
     ORDER BY period_end DESC LIMIT 1`,
    [carrierId, driverId]
  )
}

export interface HosSnapshot {
  ts: string
  duty_status: string | null
  drive_remaining_minutes: number | null
  shift_remaining_minutes: number | null
  cycle_remaining_minutes: number | null
}

/**
 * Latest HOS clocks from the ELD sync — display only, the ELD is the legal
 * record. Returns null until the telematics integration lands data (the
 * table itself arrives with the integrations migration; guard with regclass).
 */
export async function latestHosSnapshot(
  carrierId: string,
  driverId: string
): Promise<HosSnapshot | null> {
  const exists = await queryOne<{ reg: string | null }>(
    `SELECT to_regclass('hub.hos_snapshots')::text AS reg`
  )
  if (!exists?.reg) return null
  return queryOne<HosSnapshot>(
    `SELECT ts, duty_status, drive_remaining_minutes, shift_remaining_minutes, cycle_remaining_minutes
     FROM hub.hos_snapshots WHERE carrier_id = $1 AND driver_id = $2
     ORDER BY ts DESC LIMIT 1`,
    [carrierId, driverId]
  )
}

/** Expiring documents (CDL / med card) for the driver's own warning pills. */
export async function driverExpiries(
  carrierId: string,
  driverId: string
): Promise<{ cdl_expiry: string | null; medical_card_expiry: string | null }> {
  const row = await queryOne<{ cdl_expiry: string | null; medical_card_expiry: string | null }>(
    `SELECT cdl_expiry, medical_card_expiry FROM hub.drivers WHERE carrier_id = $1 AND id = $2`,
    [carrierId, driverId]
  )
  return row ?? { cdl_expiry: null, medical_card_expiry: null }
}
