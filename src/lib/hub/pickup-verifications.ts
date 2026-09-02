/**
 * DB half of pickup verification (pure half: pickup-verification.ts).
 * Carrier-scoped in every statement; a load id from a URL never reaches
 * another tenant's evidence.
 */
import { query, queryOne } from "./db"
import type { PickupCheck, PickupResult } from "./pickup-verification"

export interface PickupVerificationRow {
  id: string
  load_id: string
  stop_id: string
  driver_id: string | null
  truck_id: string | null
  distance_miles: string | null
  photo_document_id: string | null
  result: PickupResult
  checks: PickupCheck[]
  created_at: string
}

const COLS = `id, load_id, stop_id, driver_id, truck_id, distance_miles, photo_document_id, result, checks, created_at`

export async function recordPickupVerification(input: {
  carrierId: string
  loadId: string
  stopId: string
  driverId: string | null
  truckId: string | null
  fix: { lat: number; lng: number } | null
  distanceMiles: number | null
  photoDocumentId: string | null
  result: PickupResult
  checks: PickupCheck[]
}): Promise<PickupVerificationRow> {
  const rows = await query<PickupVerificationRow>(
    `INSERT INTO hub.pickup_verifications
       (carrier_id, load_id, stop_id, driver_id, truck_id, lat, lng, distance_miles, photo_document_id, result, checks)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING ${COLS}`,
    [
      input.carrierId, input.loadId, input.stopId, input.driverId, input.truckId,
      input.fix?.lat ?? null, input.fix?.lng ?? null, input.distanceMiles,
      input.photoDocumentId, input.result, JSON.stringify(input.checks),
    ]
  )
  return rows[0]
}

/** Newest verification for a load — the one the office and /track act on. */
export async function latestPickupVerification(
  carrierId: string,
  loadId: string
): Promise<PickupVerificationRow | null> {
  return queryOne<PickupVerificationRow>(
    `SELECT ${COLS} FROM hub.pickup_verifications
     WHERE carrier_id = $1 AND load_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [carrierId, loadId]
  )
}

/** Newest verification per load, for the dispatch board's chips in one query. */
export async function latestPickupVerificationsByLoad(
  carrierId: string,
  loadIds: string[]
): Promise<Map<string, PickupVerificationRow>> {
  if (loadIds.length === 0) return new Map()
  const rows = await query<PickupVerificationRow>(
    `SELECT DISTINCT ON (load_id) ${COLS} FROM hub.pickup_verifications
     WHERE carrier_id = $1 AND load_id = ANY($2::uuid[])
     ORDER BY load_id, created_at DESC`,
    [carrierId, loadIds]
  )
  return new Map(rows.map((r) => [r.load_id, r]))
}
