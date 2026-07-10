/**
 * Driver-app data layer: everything is scoped to the signed-in driver.
 * Drivers never see margins, other drivers' loads, or office-only data —
 * enforced here at the query layer, not in the UI.
 */
import { query, queryOne } from "./db"
import type { Load, Stop, Settlement, SettlementLine, HubDocument, DocumentRequest } from "./types"

/** Statuses where a load is "live" for the driver. */
export const DRIVER_ACTIVE_STATUSES = ["dispatched", "at_pickup", "in_transit", "delivered"] as const

/** Status taps the driver may perform (forward-only, their own load). */
export const DRIVER_STATUS_FLOW: Record<string, string> = {
  dispatched: "at_pickup",
  at_pickup: "in_transit",
  in_transit: "delivered",
}

export interface DriverLoad extends Load {
  stops?: Stop[]
}

/** The driver's current/next loads with stops, facility notes ready to join. */
export async function driverActiveLoads(carrierId: string, driverId: string): Promise<DriverLoad[]> {
  const loads = await query<DriverLoad>(
    `SELECT l.*, c.name AS customer_name,
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
