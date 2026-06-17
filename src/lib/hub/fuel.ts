import { hubDbAvailable, query } from "./db"
import { fallbackFuelTransactions, fallbackTrucks } from "./sandbox-fallback"
import type { FuelTransaction } from "./types"

export async function listFuelTransactions(
  carrierId: string,
  filters: { truckId?: string; limit?: number } = {}
): Promise<FuelTransaction[]> {
  if (!hubDbAvailable()) {
    let rows = fallbackFuelTransactions(carrierId)
    if (filters.truckId) rows = rows.filter((row) => row.truck_id === filters.truckId)
    return rows.slice(0, filters.limit ?? 200)
  }
  const params: unknown[] = [carrierId]
  let where = `f.carrier_id = $1`
  if (filters.truckId) {
    params.push(filters.truckId)
    where += ` AND f.truck_id = $${params.length}`
  }
  return query<FuelTransaction>(
    `SELECT f.*, t.unit_number AS truck_unit, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.fuel_transactions f
     LEFT JOIN hub.trucks t ON t.id = f.truck_id
     LEFT JOIN hub.drivers d ON d.id = f.driver_id
     WHERE ${where}
     ORDER BY f.ts DESC LIMIT ${Math.min(filters.limit ?? 200, 1000)}`,
    params
  )
}

export interface FuelTruckStats {
  truck_id: string | null
  truck_unit: string | null
  gallons: string
  total_cents: string
  transactions: number
  loaded_miles: string | null
  avg_price_cents: string | null
}

/** Per-truck fuel stats over a window, with loaded miles for cost/mile + MPG. */
export async function fuelStatsByTruck(carrierId: string, days = 92): Promise<FuelTruckStats[]> {
  if (!hubDbAvailable()) {
    const txs = fallbackFuelTransactions(carrierId)
    return fallbackTrucks(carrierId).map((truck) => {
      const mine = txs.filter((tx) => tx.truck_id === truck.id)
      const gallons = mine.reduce((sum, tx) => sum + Number(tx.gallons), 0)
      const total = mine.reduce((sum, tx) => sum + tx.total_cents, 0)
      return {
        truck_id: truck.id,
        truck_unit: truck.unit_number,
        gallons: gallons.toFixed(3),
        total_cents: String(total),
        transactions: mine.length,
        loaded_miles: "1850",
        avg_price_cents: gallons > 0 ? String(Math.round(total / gallons)) : null,
      }
    })
  }
  return query<FuelTruckStats>(
    `SELECT f.truck_id, t.unit_number AS truck_unit,
       SUM(f.gallons) AS gallons,
       SUM(f.total_cents) AS total_cents,
       COUNT(*)::int AS transactions,
       (SELECT SUM(l.loaded_miles) FROM hub.loads l
         WHERE l.truck_id = f.truck_id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= NOW() - ($2 || ' days')::interval) AS loaded_miles,
       (SUM(f.total_cents) / NULLIF(SUM(f.gallons), 0))::int AS avg_price_cents
     FROM hub.fuel_transactions f
     LEFT JOIN hub.trucks t ON t.id = f.truck_id
     WHERE f.carrier_id = $1 AND f.ts >= NOW() - ($2 || ' days')::interval
     GROUP BY f.truck_id, t.unit_number
     ORDER BY t.unit_number NULLS LAST`,
    [carrierId, days]
  )
}

export interface FuelByProgram {
  card_program: string | null
  gallons: string
  total_cents: string
  avg_price_cents: string | null
}

export async function fuelByProgram(carrierId: string, days = 92): Promise<FuelByProgram[]> {
  if (!hubDbAvailable()) {
    const byProgram = new Map<string, { gallons: number; total: number }>()
    for (const tx of fallbackFuelTransactions(carrierId)) {
      const key = tx.card_program ?? "Unknown"
      const current = byProgram.get(key) ?? { gallons: 0, total: 0 }
      current.gallons += Number(tx.gallons)
      current.total += tx.total_cents
      byProgram.set(key, current)
    }
    return [...byProgram.entries()].map(([card_program, value]) => ({
      card_program,
      gallons: value.gallons.toFixed(3),
      total_cents: String(value.total),
      avg_price_cents: value.gallons > 0 ? String(Math.round(value.total / value.gallons)) : null,
    }))
  }
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
  if (!hubDbAvailable()) {
    const truck = fallbackTrucks(carrierId)[0]
    return [{
      kind: "over_capacity",
      detail: "Sandbox check: gallons would exceed tank capacity on a bad import row",
      ts: new Date().toISOString(),
      truck_unit: truck?.unit_number ?? null,
    }]
  }
  const duplicates = await query<FuelFraudFlag>(
    `SELECT 'duplicate' AS kind,
       'Same card/time/amount: ' || COALESCE(f1.merchant, '?') || ' $' || ROUND(f1.total_cents / 100.0, 2) AS detail,
       f1.ts::text AS ts, t.unit_number AS truck_unit
     FROM hub.fuel_transactions f1
     JOIN hub.fuel_transactions f2 ON f2.carrier_id = f1.carrier_id AND f2.id > f1.id
       AND f2.total_cents = f1.total_cents
       AND ABS(EXTRACT(EPOCH FROM (f2.ts - f1.ts))) < 3600
       AND COALESCE(f2.truck_id::text, '') = COALESCE(f1.truck_id::text, '')
     LEFT JOIN hub.trucks t ON t.id = f1.truck_id
     WHERE f1.carrier_id = $1 AND f1.ts >= NOW() - ($2 || ' days')::interval`,
    [carrierId, days]
  )
  const overCapacity = await query<FuelFraudFlag>(
    `SELECT 'over_capacity' AS kind,
       ROUND(f.gallons, 1) || ' gal exceeds ' || t.tank_capacity_gallons || ' gal tank' AS detail,
       f.ts::text AS ts, t.unit_number AS truck_unit
     FROM hub.fuel_transactions f
     JOIN hub.trucks t ON t.id = f.truck_id
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
