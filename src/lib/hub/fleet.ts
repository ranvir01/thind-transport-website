import { query, queryOne } from "./db"
import type { Trailer, Truck } from "./types"

// ---- Trucks ----

export async function listTrucks(): Promise<Truck[]> {
  return query<Truck>(
    `SELECT t.*, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.trucks t
     LEFT JOIN hub.drivers d ON d.id = t.assigned_driver_id
     WHERE t.deleted_at IS NULL
     ORDER BY t.unit_number`
  )
}

export async function getTruck(id: string): Promise<Truck | null> {
  return queryOne<Truck>(
    `SELECT t.*, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.trucks t
     LEFT JOIN hub.drivers d ON d.id = t.assigned_driver_id
     WHERE t.id = $1 AND t.deleted_at IS NULL`,
    [id]
  )
}

export interface TruckInput {
  unit_number: string
  vin?: string | null
  plate?: string | null
  plate_state?: string | null
  year?: number | null
  make?: string | null
  model?: string | null
  ownership: "company" | "owner_operator"
  status: "active" | "shop" | "idle" | "retired"
  registration_expiry?: string | null
  inspection_due?: string | null
  insurance_expiry?: string | null
  assigned_driver_id?: string | null
  notes?: string | null
}

export async function createTruck(input: TruckInput): Promise<Truck> {
  const rows = await query<Truck>(
    `INSERT INTO hub.trucks (
       unit_number, vin, plate, plate_state, year, make, model, ownership, status,
       registration_expiry, inspection_due, insurance_expiry, assigned_driver_id, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      input.unit_number, input.vin ?? null, input.plate ?? null, input.plate_state ?? null,
      input.year ?? null, input.make ?? null, input.model ?? null, input.ownership, input.status,
      input.registration_expiry ?? null, input.inspection_due ?? null, input.insurance_expiry ?? null,
      input.assigned_driver_id ?? null, input.notes ?? null,
    ]
  )
  return rows[0]
}

export async function updateTruck(id: string, input: TruckInput): Promise<Truck | null> {
  const rows = await query<Truck>(
    `UPDATE hub.trucks SET
       unit_number=$2, vin=$3, plate=$4, plate_state=$5, year=$6, make=$7, model=$8,
       ownership=$9, status=$10, registration_expiry=$11, inspection_due=$12,
       insurance_expiry=$13, assigned_driver_id=$14, notes=$15, updated_at=NOW()
     WHERE id=$1 AND deleted_at IS NULL
     RETURNING *`,
    [
      id, input.unit_number, input.vin ?? null, input.plate ?? null, input.plate_state ?? null,
      input.year ?? null, input.make ?? null, input.model ?? null, input.ownership, input.status,
      input.registration_expiry ?? null, input.inspection_due ?? null, input.insurance_expiry ?? null,
      input.assigned_driver_id ?? null, input.notes ?? null,
    ]
  )
  return rows[0] ?? null
}

// ---- Trailers ----

export async function listTrailers(): Promise<Trailer[]> {
  return query<Trailer>(
    `SELECT * FROM hub.trailers WHERE deleted_at IS NULL ORDER BY unit_number`
  )
}

export async function getTrailer(id: string): Promise<Trailer | null> {
  return queryOne<Trailer>(`SELECT * FROM hub.trailers WHERE id = $1 AND deleted_at IS NULL`, [id])
}

export interface TrailerInput {
  unit_number: string
  vin?: string | null
  plate?: string | null
  plate_state?: string | null
  year?: number | null
  make?: string | null
  type: "flatbed" | "reefer" | "dry_van"
  status: "active" | "shop" | "idle" | "retired"
  registration_expiry?: string | null
  inspection_due?: string | null
  notes?: string | null
}

export async function createTrailer(input: TrailerInput): Promise<Trailer> {
  const rows = await query<Trailer>(
    `INSERT INTO hub.trailers (
       unit_number, vin, plate, plate_state, year, make, type, status,
       registration_expiry, inspection_due, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      input.unit_number, input.vin ?? null, input.plate ?? null, input.plate_state ?? null,
      input.year ?? null, input.make ?? null, input.type, input.status,
      input.registration_expiry ?? null, input.inspection_due ?? null, input.notes ?? null,
    ]
  )
  return rows[0]
}

export async function updateTrailer(id: string, input: TrailerInput): Promise<Trailer | null> {
  const rows = await query<Trailer>(
    `UPDATE hub.trailers SET
       unit_number=$2, vin=$3, plate=$4, plate_state=$5, year=$6, make=$7, type=$8,
       status=$9, registration_expiry=$10, inspection_due=$11, notes=$12, updated_at=NOW()
     WHERE id=$1 AND deleted_at IS NULL
     RETURNING *`,
    [
      id, input.unit_number, input.vin ?? null, input.plate ?? null, input.plate_state ?? null,
      input.year ?? null, input.make ?? null, input.type, input.status,
      input.registration_expiry ?? null, input.inspection_due ?? null, input.notes ?? null,
    ]
  )
  return rows[0] ?? null
}

// ---- Fleet map ----

export interface TruckPosition {
  truck_id: string
  unit_number: string
  status: string
  driver_name: string | null
  lat: number
  lng: number
  ts: string
}

export async function latestTruckPositions(): Promise<TruckPosition[]> {
  return query<TruckPosition>(
    `SELECT DISTINCT ON (p.truck_id)
       p.truck_id, t.unit_number, t.status,
       d.first_name || ' ' || d.last_name AS driver_name,
       p.lat, p.lng, p.ts
     FROM hub.position_pings p
     JOIN hub.trucks t ON t.id = p.truck_id AND t.deleted_at IS NULL
     LEFT JOIN hub.drivers d ON d.id = t.assigned_driver_id
     ORDER BY p.truck_id, p.ts DESC`
  )
}
