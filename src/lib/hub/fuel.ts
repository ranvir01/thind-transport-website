import { query } from "./db"
import type { FuelTransaction } from "./types"

export async function listFuelTransactions(
  carrierId: string,
  filters: { truckId?: string; limit?: number } = {}
): Promise<FuelTransaction[]> {
  const params: unknown[] = [carrierId]
  let where = `f.carrier_id = $1`
  if (filters.truckId) {
    params.push(filters.truckId)
    where += ` AND f.truck_id = $${params.length}`
  }
  return query<FuelTransaction>(
    `SELECT f.*, t.unit_number AS truck_unit, d.first_name || ' ' || d.last_name AS driver_name,
       l.reference AS load_reference
     FROM hub.fuel_transactions f
     LEFT JOIN hub.trucks t ON t.id = f.truck_id AND t.carrier_id = f.carrier_id
     LEFT JOIN hub.drivers d ON d.id = f.driver_id AND d.carrier_id = f.carrier_id
     LEFT JOIN hub.loads l ON l.id = f.load_id AND l.carrier_id = f.carrier_id
     WHERE ${where}
     ORDER BY f.ts DESC LIMIT ${Math.min(filters.limit ?? 200, 1000)}`,
    params
  )
}

/** Fuel receipts not yet reconciled to a load — the "match these up" inbox. */
export async function listUnassignedFuel(
  carrierId: string,
  limit = 40
): Promise<FuelTransaction[]> {
  return query<FuelTransaction>(
    `SELECT f.*, t.unit_number AS truck_unit, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.fuel_transactions f
     LEFT JOIN hub.trucks t ON t.id = f.truck_id AND t.carrier_id = f.carrier_id
     LEFT JOIN hub.drivers d ON d.id = f.driver_id AND d.carrier_id = f.carrier_id
     WHERE f.carrier_id = $1 AND f.load_id IS NULL
     ORDER BY f.ts DESC LIMIT ${Math.min(limit, 200)}`,
    [carrierId]
  )
}

/** Every pump receipt reconciled to one load (load detail + all-in economics). */
export async function fuelForLoad(carrierId: string, loadId: string): Promise<FuelTransaction[]> {
  return query<FuelTransaction>(
    `SELECT f.*, t.unit_number AS truck_unit, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.fuel_transactions f
     LEFT JOIN hub.trucks t ON t.id = f.truck_id AND t.carrier_id = f.carrier_id
     LEFT JOIN hub.drivers d ON d.id = f.driver_id AND d.carrier_id = f.carrier_id
     WHERE f.carrier_id = $1 AND f.load_id = $2
     ORDER BY f.ts ASC`,
    [carrierId, loadId]
  )
}

export interface AssignableLoad {
  id: string
  reference: string
  truck_id: string | null
  origin: string | null
  dest: string | null
  pickup_date: string | null
}

/**
 * Recent, still-open loads a receipt can be matched to. Kept slim for the
 * client picker; the panel narrows the list to the receipt's truck first.
 */
export async function assignableLoadsForFuel(carrierId: string, days = 120): Promise<AssignableLoad[]> {
  return query<AssignableLoad>(
    `SELECT l.id, l.reference, l.truck_id,
       NULLIF(CONCAT_WS(', ', fs.city, fs.state), '') AS origin,
       NULLIF(CONCAT_WS(', ', ls.city, ls.state), '') AS dest,
       to_char(fs.appt_start, 'YYYY-MM-DD') AS pickup_date
     FROM hub.loads l
     LEFT JOIN LATERAL (
       SELECT city, state, appt_start FROM hub.stops WHERE load_id = l.id AND type = 'pickup'
       ORDER BY sequence ASC LIMIT 1
     ) fs ON TRUE
     LEFT JOIN LATERAL (
       SELECT city, state FROM hub.stops WHERE load_id = l.id AND type = 'delivery'
       ORDER BY sequence DESC LIMIT 1
     ) ls ON TRUE
     WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled'
       AND l.created_at >= NOW() - ($2 || ' days')::interval
     ORDER BY l.created_at DESC LIMIT 300`,
    [carrierId, days]
  )
}

/**
 * Reconcile a receipt to a load (or clear it with loadId = null). Carrier-scoped
 * on both the receipt and the load, so a receipt can never point at another
 * tenant's load. Returns the number of rows touched (0 = nothing matched).
 */
export async function assignFuelToLoad(
  carrierId: string,
  transactionId: string,
  loadId: string | null
): Promise<number> {
  if (loadId === null) {
    const res = await query(
      `UPDATE hub.fuel_transactions SET load_id = NULL
       WHERE carrier_id = $1 AND id = $2 RETURNING id`,
      [carrierId, transactionId]
    )
    return res.length
  }
  const res = await query(
    `UPDATE hub.fuel_transactions f SET load_id = l.id
     FROM hub.loads l
     WHERE f.carrier_id = $1 AND f.id = $2
       AND l.id = $3 AND l.carrier_id = $1 AND l.deleted_at IS NULL
     RETURNING f.id`,
    [carrierId, transactionId, loadId]
  )
  return res.length
}

export interface FuelTruckStats {
  truck_id: string | null
  truck_unit: string | null
  gallons: string
  /** Propulsion (road) gallons only — reefer/DEF are excluded from MPG. */
  tractor_gallons: string
  total_cents: string
  transactions: number
  loaded_miles: string | null
  avg_price_cents: string | null
}

/**
 * Per-truck fuel stats over a window, with loaded miles for cost/mile + MPG.
 * Spend counts every gallon; MPG only counts tractor (propulsion) fuel —
 * reefer fuel is not propulsion fuel and would silently inflate burn rates.
 */
export async function fuelStatsByTruck(carrierId: string, days = 92): Promise<FuelTruckStats[]> {
  return query<FuelTruckStats>(
    `SELECT f.truck_id, t.unit_number AS truck_unit,
       SUM(f.gallons) AS gallons,
       COALESCE(SUM(f.gallons) FILTER (WHERE f.fuel_use = 'tractor'), 0) AS tractor_gallons,
       SUM(f.total_cents) AS total_cents,
       COUNT(*)::int AS transactions,
       (SELECT SUM(l.loaded_miles) FROM hub.loads l
         WHERE l.truck_id = f.truck_id AND l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= NOW() - ($2 || ' days')::interval) AS loaded_miles,
       (SUM(f.total_cents) / NULLIF(SUM(f.gallons), 0))::int AS avg_price_cents
     FROM hub.fuel_transactions f
     LEFT JOIN hub.trucks t ON t.id = f.truck_id AND t.carrier_id = f.carrier_id
     WHERE f.carrier_id = $1 AND f.ts >= NOW() - ($2 || ' days')::interval
     GROUP BY f.truck_id, t.unit_number
     ORDER BY t.unit_number NULLS LAST`,
    [carrierId, days]
  )
}

/** Manual reclassification from the review UI (pump products are messy). */
export async function setFuelUse(
  carrierId: string,
  transactionId: string,
  fuelUse: "tractor" | "reefer" | "other"
): Promise<boolean> {
  const rows = await query(
    `UPDATE hub.fuel_transactions SET fuel_use = $3 WHERE carrier_id = $1 AND id = $2 RETURNING id`,
    [carrierId, transactionId, fuelUse]
  )
  return rows.length > 0
}

export interface FuelByProgram {
  card_program: string | null
  gallons: string
  total_cents: string
  avg_price_cents: string | null
}

export async function fuelByProgram(carrierId: string, days = 92): Promise<FuelByProgram[]> {
  return query<FuelByProgram>(
    `SELECT card_program, SUM(gallons) AS gallons, SUM(total_cents) AS total_cents,
       (SUM(total_cents) / NULLIF(SUM(gallons), 0))::int AS avg_price_cents
     FROM hub.fuel_transactions
     WHERE carrier_id = $1 AND ts >= NOW() - ($2 || ' days')::interval
     GROUP BY card_program ORDER BY total_cents DESC`,
    [carrierId, days]
  )
}

export interface FuelFraudFlag {
  kind: string
  detail: string
  ts: string
  truck_unit: string | null
}

/** Fraud flags: duplicates and gallons over tank capacity (position-vs-card lands with live ELD). */
export async function fuelFraudFlags(carrierId: string, days = 92): Promise<FuelFraudFlag[]> {
  const duplicates = await query<FuelFraudFlag>(
    `SELECT 'duplicate' AS kind,
       'Same card/time/amount: ' || COALESCE(f1.merchant, '?') || ' $' || ROUND(f1.total_cents / 100.0, 2) AS detail,
       f1.ts::text AS ts, t.unit_number AS truck_unit
     FROM hub.fuel_transactions f1
     JOIN hub.fuel_transactions f2 ON f2.carrier_id = f1.carrier_id AND f2.id > f1.id
       AND f2.total_cents = f1.total_cents
       AND ABS(EXTRACT(EPOCH FROM (f2.ts - f1.ts))) < 3600
       AND COALESCE(f2.truck_id::text, '') = COALESCE(f1.truck_id::text, '')
     LEFT JOIN hub.trucks t ON t.id = f1.truck_id AND t.carrier_id = f1.carrier_id
     WHERE f1.carrier_id = $1 AND f1.ts >= NOW() - ($2 || ' days')::interval`,
    [carrierId, days]
  )
  const overCapacity = await query<FuelFraudFlag>(
    `SELECT 'over_capacity' AS kind,
       ROUND(f.gallons, 1) || ' gal exceeds ' || t.tank_capacity_gallons || ' gal tank' AS detail,
       f.ts::text AS ts, t.unit_number AS truck_unit
     FROM hub.fuel_transactions f
     JOIN hub.trucks t ON t.id = f.truck_id AND t.carrier_id = f.carrier_id
     WHERE f.carrier_id = $1 AND t.tank_capacity_gallons IS NOT NULL
       AND f.gallons > t.tank_capacity_gallons
       AND f.ts >= NOW() - ($2 || ' days')::interval`,
    [carrierId, days]
  )
  return [...duplicates, ...overCapacity].sort((a, b) => b.ts.localeCompare(a.ts))
}

/** Free EIA weekly on-highway diesel price (cents/gal), cached; null without a key. */
export async function eiaDieselPriceCents(): Promise<number | null> {
  const key = process.env.EIA_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${key}&frequency=weekly&data[0]=value&facets[series][]=EMD_EPD2D_PTE_NUS_DPG&sort[0][column]=period&sort[0][direction]=desc&length=1`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const value = data?.response?.data?.[0]?.value
    return value ? Math.round(Number(value) * 100) : null
  } catch {
    return null
  }
}
