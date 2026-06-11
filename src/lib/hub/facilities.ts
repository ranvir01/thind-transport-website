/**
 * Facility intelligence (E2): the notes every driver wishes existed.
 *
 * Facilities are the root entity extracted from stops (migration 005 dedupes
 * by geocode bucket). Stops link to facilities; dwell history computes from
 * stop arrived_at/departed_at; notes are crowdsourced from drivers + office.
 */
import { query, queryOne } from "./db"
import type { Facility, FacilityNote } from "./types"

/**
 * Stable facility identity — MUST stay in sync with the SQL expression in
 * migrations/hub/005_retrofits_spines.sql. Normalized name + ~1km geocode
 * bucket when coordinates exist, else normalized city/state.
 */
export function facilityDedupeKey(input: {
  name: string
  lat?: number | null
  lng?: number | null
  city?: string | null
  state?: string | null
}): string {
  const name = input.name.trim().toLowerCase()
  if (input.lat != null && input.lng != null) {
    // Match Postgres round(numeric, 2): half away from zero, trailing zeros kept.
    const r = (n: number) =>
      (Math.sign(n) * Math.round(Math.abs(n) * 100) / 100).toFixed(2)
    return `${name}|${r(input.lat)},${r(input.lng)}`
  }
  const city = (input.city ?? "").trim().toLowerCase()
  const state = (input.state ?? "").trim().toLowerCase()
  return `${name}|${city},${state}`
}

/** Find or create the facility for a stop being saved. */
export async function upsertFacility(
  carrierId: string,
  input: {
    name: string
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    lat?: number | null
    lng?: number | null
    type?: "shipper" | "receiver" | "both"
  }
): Promise<string> {
  const key = facilityDedupeKey(input)
  const row = await queryOne<{ id: string }>(
    `INSERT INTO hub.facilities (carrier_id, name, dedupe_key, address, city, state, zip, lat, lng, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (carrier_id, dedupe_key) DO UPDATE SET
       address = COALESCE(hub.facilities.address, EXCLUDED.address),
       zip = COALESCE(hub.facilities.zip, EXCLUDED.zip),
       lat = COALESCE(hub.facilities.lat, EXCLUDED.lat),
       lng = COALESCE(hub.facilities.lng, EXCLUDED.lng),
       updated_at = NOW()
     RETURNING id`,
    [
      carrierId,
      input.name.trim(),
      key,
      input.address ?? null,
      input.city ?? null,
      input.state ?? null,
      input.zip ?? null,
      input.lat ?? null,
      input.lng ?? null,
      input.type ?? "both",
    ]
  )
  return row!.id
}

const FACILITY_LIST_SELECT = `
  SELECT f.*,
    (SELECT COUNT(*)::int FROM hub.stops s WHERE s.facility_id = f.id) AS stop_count,
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (s.departed_at - s.arrived_at)) / 60))::int
       FROM hub.stops s
       WHERE s.facility_id = f.id AND s.arrived_at IS NOT NULL AND s.departed_at IS NOT NULL
         AND s.departed_at > s.arrived_at) AS avg_dwell_minutes,
    (SELECT COUNT(*)::int FROM hub.facility_notes n WHERE n.facility_id = f.id) AS note_count
  FROM hub.facilities f`

export async function listFacilities(
  carrierId: string,
  search?: string
): Promise<Facility[]> {
  const params: unknown[] = [carrierId]
  let where = `f.carrier_id = $1`
  if (search?.trim()) {
    params.push(`%${search.trim()}%`)
    where += ` AND (f.name ILIKE $2 OR f.city ILIKE $2 OR f.state ILIKE $2)`
  }
  return query<Facility>(`${FACILITY_LIST_SELECT} WHERE ${where} ORDER BY f.name LIMIT 300`, params)
}

export async function getFacility(carrierId: string, id: string): Promise<Facility | null> {
  return queryOne<Facility>(`${FACILITY_LIST_SELECT} WHERE f.carrier_id = $1 AND f.id = $2`, [
    carrierId,
    id,
  ])
}

export async function updateFacilityInfo(
  carrierId: string,
  id: string,
  patch: {
    hours?: string | null
    phone?: string | null
    overnightParking?: boolean | null
    typicalLumperCents?: number | null
    notes?: string | null
  }
): Promise<void> {
  await query(
    `UPDATE hub.facilities SET
       hours = $3, phone = $4, overnight_parking = $5, typical_lumper_cents = $6,
       notes = $7, updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2`,
    [
      carrierId,
      id,
      patch.hours ?? null,
      patch.phone ?? null,
      patch.overnightParking ?? null,
      patch.typicalLumperCents ?? null,
      patch.notes ?? null,
    ]
  )
}

// ---- Notes ----

export async function listFacilityNotes(
  carrierId: string,
  facilityId: string,
  limit = 50
): Promise<FacilityNote[]> {
  return query<FacilityNote>(
    `SELECT n.*, d.url AS document_url
     FROM hub.facility_notes n
     LEFT JOIN hub.documents d ON d.id = n.document_id
     WHERE n.carrier_id = $1 AND n.facility_id = $2
     ORDER BY n.created_at DESC LIMIT $3`,
    [carrierId, facilityId, limit]
  )
}

export async function addFacilityNote(
  carrierId: string,
  facilityId: string,
  input: {
    body: string
    tags?: string[]
    documentId?: string | null
    author: { id: string; name: string; role: string }
  }
): Promise<void> {
  await query(
    `INSERT INTO hub.facility_notes (carrier_id, facility_id, author_id, author_name, author_role, body, tags, document_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      carrierId,
      facilityId,
      input.author.id,
      input.author.name,
      input.author.role,
      input.body.trim(),
      JSON.stringify(input.tags ?? []),
      input.documentId ?? null,
    ]
  )
}

// ---- Dwell / detention risk ----

export interface FacilityDwell {
  facility_id: string
  avg_dwell_minutes: number
  samples: number
}

/** Average dwell for a set of facilities in one query (booking + stop cards). */
export async function dwellByFacility(
  carrierId: string,
  facilityIds: string[]
): Promise<Map<string, FacilityDwell>> {
  if (facilityIds.length === 0) return new Map()
  const rows = await query<FacilityDwell>(
    `SELECT s.facility_id,
       ROUND(AVG(EXTRACT(EPOCH FROM (s.departed_at - s.arrived_at)) / 60))::int AS avg_dwell_minutes,
       COUNT(*)::int AS samples
     FROM hub.stops s
     WHERE s.carrier_id = $1 AND s.facility_id = ANY($2)
       AND s.arrived_at IS NOT NULL AND s.departed_at IS NOT NULL AND s.departed_at > s.arrived_at
     GROUP BY s.facility_id`,
    [carrierId, facilityIds]
  )
  return new Map(rows.map((r) => [r.facility_id, r]))
}

/** Detention risk when the historical average dwell exceeds the free window. */
export function detentionRisk(
  avgDwellMinutes: number | null | undefined,
  freeMinutes: number
): "high" | "warn" | null {
  if (avgDwellMinutes == null) return null
  if (avgDwellMinutes >= freeMinutes) return "high"
  if (avgDwellMinutes >= freeMinutes * 0.75) return "warn"
  return null
}

/** Format minutes as "3h 40m" for badges and warnings. */
export function formatDwell(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
