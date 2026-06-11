/**
 * Incidents & safety (retrofit E11): every accident/incident on file, with the
 * 49 CFR 390.5 qualifiers (fatality / injury treated away from the scene /
 * tow-away disabling damage) so the DOT accident register is derivable — and
 * exportable — instead of being a binder somebody forgot to keep.
 */
import { query, queryOne } from "./db"
import type { Incident } from "./types"

const INCIDENT_SELECT = `
  SELECT i.*,
    t.unit_number AS truck_unit,
    d.first_name || ' ' || d.last_name AS driver_name,
    l.reference AS load_reference
  FROM hub.incidents i
  LEFT JOIN hub.trucks t ON t.id = i.truck_id
  LEFT JOIN hub.drivers d ON d.id = i.driver_id
  LEFT JOIN hub.loads l ON l.id = i.load_id`

export async function listIncidents(
  carrierId: string,
  filters: { recordableOnly?: boolean; status?: string; limit?: number } = {}
): Promise<Incident[]> {
  const params: unknown[] = [carrierId]
  let where = `i.carrier_id = $1`
  if (filters.recordableOnly) where += ` AND i.dot_recordable`
  if (filters.status) {
    params.push(filters.status)
    where += ` AND i.status = $${params.length}`
  }
  return query<Incident>(
    `${INCIDENT_SELECT} WHERE ${where} ORDER BY i.occurred_at DESC LIMIT ${Math.min(filters.limit ?? 200, 1000)}`,
    params
  )
}

export async function getIncident(carrierId: string, id: string): Promise<Incident | null> {
  return queryOne<Incident>(`${INCIDENT_SELECT} WHERE i.carrier_id = $1 AND i.id = $2`, [
    carrierId,
    id,
  ])
}

export interface IncidentInput {
  truckId?: string | null
  driverId?: string | null
  loadId?: string | null
  occurredAt: string
  location?: string | null
  description?: string | null
  policeReport?: string | null
  fatality: boolean
  injuryTreatedAway: boolean
  towAwayDisabling: boolean
  lat?: number | null
  lng?: number | null
}

export async function createIncident(
  carrierId: string,
  input: IncidentInput,
  reporter: { id: string; name: string }
): Promise<Incident> {
  const rows = await query<Incident>(
    `INSERT INTO hub.incidents (
       carrier_id, truck_id, driver_id, load_id, occurred_at, location, description,
       police_report, fatality, injury_treated_away, tow_away_disabling, lat, lng,
       reported_by, reported_by_name
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      carrierId, input.truckId ?? null, input.driverId ?? null, input.loadId ?? null,
      input.occurredAt, input.location ?? null, input.description ?? null,
      input.policeReport ?? null, input.fatality, input.injuryTreatedAway,
      input.towAwayDisabling, input.lat ?? null, input.lng ?? null,
      reporter.id, reporter.name,
    ]
  )
  return rows[0]
}

export async function updateIncident(
  carrierId: string,
  id: string,
  patch: Partial<IncidentInput> & { status?: "open" | "under_review" | "closed" }
): Promise<Incident | null> {
  const current = await getIncident(carrierId, id)
  if (!current) return null
  const rows = await query<Incident>(
    `UPDATE hub.incidents SET
       truck_id = $3, driver_id = $4, load_id = $5, occurred_at = $6, location = $7,
       description = $8, police_report = $9, fatality = $10, injury_treated_away = $11,
       tow_away_disabling = $12, status = $13, updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2 RETURNING *`,
    [
      carrierId, id,
      patch.truckId !== undefined ? patch.truckId : current.truck_id,
      patch.driverId !== undefined ? patch.driverId : current.driver_id,
      patch.loadId !== undefined ? patch.loadId : current.load_id,
      patch.occurredAt ?? current.occurred_at,
      patch.location !== undefined ? patch.location : current.location,
      patch.description !== undefined ? patch.description : current.description,
      patch.policeReport !== undefined ? patch.policeReport : current.police_report,
      patch.fatality ?? current.fatality,
      patch.injuryTreatedAway ?? current.injury_treated_away,
      patch.towAwayDisabling ?? current.tow_away_disabling,
      patch.status ?? current.status,
    ]
  )
  return rows[0] ?? null
}

/**
 * The DOT accident register (49 CFR 390.15(b)): date, location, driver,
 * fatalities/injuries, hazmat — carriers must keep it for three years and
 * produce it on demand. One click, never a scramble.
 */
export async function accidentRegisterCsv(carrierId: string): Promise<string> {
  const rows = await listIncidents(carrierId, { recordableOnly: true, limit: 1000 })
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  return [
    "Date,Location,Driver,Truck,Load,Fatality,Injury (treated away),Tow-away (disabling),Police report,Status,Description",
    ...rows.map((i) =>
      [
        new Date(i.occurred_at).toISOString().slice(0, 10),
        esc(i.location),
        esc(i.driver_name),
        esc(i.truck_unit ? `#${i.truck_unit}` : ""),
        esc(i.load_reference),
        i.fatality ? "YES" : "no",
        i.injury_treated_away ? "YES" : "no",
        i.tow_away_disabling ? "YES" : "no",
        esc(i.police_report),
        i.status,
        esc(i.description),
      ].join(",")
    ),
  ].join("\n")
}
