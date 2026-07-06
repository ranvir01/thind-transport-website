import { query, queryOne } from "./db"
import { assertCarrierRefs } from "./tenancy"
import type { Trailer, Truck } from "./types"

// ---- Trucks ----

export async function listTrucks(carrierId: string): Promise<Truck[]> {
  return query<Truck>(
    `SELECT t.*, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.trucks t
     LEFT JOIN hub.drivers d ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id
     WHERE t.carrier_id = $1 AND t.deleted_at IS NULL
     ORDER BY t.unit_number`,
    [carrierId]
  )
}

export async function getTruck(carrierId: string, id: string): Promise<Truck | null> {
  return queryOne<Truck>(
    `SELECT t.*, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.trucks t
     LEFT JOIN hub.drivers d ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id
     WHERE t.carrier_id = $1 AND t.id = $2 AND t.deleted_at IS NULL`,
    [carrierId, id]
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
  tank_capacity_gallons?: number | null
  notes?: string | null
}

export async function createTruck(carrierId: string, input: TruckInput): Promise<Truck> {
  await assertCarrierRefs(carrierId, { driver_id: input.assigned_driver_id })
  const rows = await query<Truck>(
    `INSERT INTO hub.trucks (
       carrier_id, unit_number, vin, plate, plate_state, year, make, model, ownership, status,
       registration_expiry, inspection_due, insurance_expiry, assigned_driver_id, tank_capacity_gallons, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      carrierId, input.unit_number, input.vin ?? null, input.plate ?? null, input.plate_state ?? null,
      input.year ?? null, input.make ?? null, input.model ?? null, input.ownership, input.status,
      input.registration_expiry ?? null, input.inspection_due ?? null, input.insurance_expiry ?? null,
      input.assigned_driver_id ?? null, input.tank_capacity_gallons ?? null, input.notes ?? null,
    ]
  )
  return rows[0]
}

export async function updateTruck(carrierId: string, id: string, input: TruckInput): Promise<Truck | null> {
  await assertCarrierRefs(carrierId, { driver_id: input.assigned_driver_id })
  const rows = await query<Truck>(
    `UPDATE hub.trucks SET
       unit_number=$3, vin=$4, plate=$5, plate_state=$6, year=$7, make=$8, model=$9,
       ownership=$10, status=$11, registration_expiry=$12, inspection_due=$13,
       insurance_expiry=$14, assigned_driver_id=$15, tank_capacity_gallons=$16, notes=$17, updated_at=NOW()
     WHERE carrier_id=$1 AND id=$2 AND deleted_at IS NULL
     RETURNING *`,
    [
      carrierId, id, input.unit_number, input.vin ?? null, input.plate ?? null, input.plate_state ?? null,
      input.year ?? null, input.make ?? null, input.model ?? null, input.ownership, input.status,
      input.registration_expiry ?? null, input.inspection_due ?? null, input.insurance_expiry ?? null,
      input.assigned_driver_id ?? null, input.tank_capacity_gallons ?? null, input.notes ?? null,
    ]
  )
  return rows[0] ?? null
}

// ---- Trailers ----

export async function listTrailers(carrierId: string): Promise<Trailer[]> {
  return query<Trailer>(
    `SELECT * FROM hub.trailers WHERE carrier_id = $1 AND deleted_at IS NULL ORDER BY unit_number`,
    [carrierId]
  )
}

export async function getTrailer(carrierId: string, id: string): Promise<Trailer | null> {
  return queryOne<Trailer>(
    `SELECT * FROM hub.trailers WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [carrierId, id]
  )
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

export async function createTrailer(carrierId: string, input: TrailerInput): Promise<Trailer> {
  const rows = await query<Trailer>(
    `INSERT INTO hub.trailers (
       carrier_id, unit_number, vin, plate, plate_state, year, make, type, status,
       registration_expiry, inspection_due, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      carrierId, input.unit_number, input.vin ?? null, input.plate ?? null, input.plate_state ?? null,
      input.year ?? null, input.make ?? null, input.type, input.status,
      input.registration_expiry ?? null, input.inspection_due ?? null, input.notes ?? null,
    ]
  )
  return rows[0]
}

export async function updateTrailer(carrierId: string, id: string, input: TrailerInput): Promise<Trailer | null> {
  const rows = await query<Trailer>(
    `UPDATE hub.trailers SET
       unit_number=$3, vin=$4, plate=$5, plate_state=$6, year=$7, make=$8, type=$9,
       status=$10, registration_expiry=$11, inspection_due=$12, notes=$13, updated_at=NOW()
     WHERE carrier_id=$1 AND id=$2 AND deleted_at IS NULL
     RETURNING *`,
    [
      carrierId, id, input.unit_number, input.vin ?? null, input.plate ?? null, input.plate_state ?? null,
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

export async function latestTruckPositions(carrierId: string): Promise<TruckPosition[]> {
  return query<TruckPosition>(
    `SELECT DISTINCT ON (p.truck_id)
       p.truck_id, t.unit_number, t.status,
       d.first_name || ' ' || d.last_name AS driver_name,
       p.lat, p.lng, p.ts
     FROM hub.position_pings p
     JOIN hub.trucks t ON t.id = p.truck_id AND t.carrier_id = p.carrier_id AND t.deleted_at IS NULL
     LEFT JOIN hub.drivers d ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id
     WHERE p.carrier_id = $1
     ORDER BY p.truck_id, p.ts DESC`,
    [carrierId]
  )
}

/** Latest position for one truck (used for city-level tracking on share links). */
export async function latestPositionForTruck(truckId: string): Promise<{ lat: number; lng: number; ts: string } | null> {
  return queryOne<{ lat: number; lng: number; ts: string }>(
    `SELECT lat, lng, ts FROM hub.position_pings WHERE truck_id = $1 ORDER BY ts DESC LIMIT 1`,
    [truckId]
  )
}
