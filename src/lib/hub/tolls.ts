import { query } from "./db"

/**
 * Toll transactions (BestPass/PrePass/state-authority CSV imports, see
 * importTollsAction in _actions/import.ts). Import lands rows with
 * truck_id = NULL whenever the statement's unit number doesn't match a known
 * truck — until now nothing surfaced those rows or the running toll total
 * anywhere, so the cost was invisible from the moment it was imported.
 */
export interface TollTransaction {
  id: string
  source: string
  external_id: string
  transponder: string | null
  truck_id: string | null
  ts: string
  plaza: string | null
  jurisdiction: string | null
  amount_cents: number
  truck_unit: string | null
}

export async function listTollTransactions(
  carrierId: string,
  filters: { truckId?: string; limit?: number } = {}
): Promise<TollTransaction[]> {
  const params: unknown[] = [carrierId]
  let where = `x.carrier_id = $1`
  if (filters.truckId) {
    params.push(filters.truckId)
    where += ` AND x.truck_id = $${params.length}`
  }
  return query<TollTransaction>(
    `SELECT x.*, t.unit_number AS truck_unit
     FROM hub.toll_transactions x
     LEFT JOIN hub.trucks t ON t.id = x.truck_id AND t.carrier_id = x.carrier_id
     WHERE ${where}
     ORDER BY x.ts DESC LIMIT ${Math.min(filters.limit ?? 200, 1000)}`,
    params
  )
}

/** Toll transactions the import couldn't match to a truck — the "match these up" inbox. */
export async function listUnassignedTolls(carrierId: string, limit = 40): Promise<TollTransaction[]> {
  return query<TollTransaction>(
    `SELECT x.*, NULL::text AS truck_unit
     FROM hub.toll_transactions x
     WHERE x.carrier_id = $1 AND x.truck_id IS NULL
     ORDER BY x.ts DESC LIMIT ${Math.min(limit, 200)}`,
    [carrierId]
  )
}

/**
 * Assign (or clear, with truckId = null) which truck a toll transaction
 * belongs to. Carrier-scoped on both the transaction and the truck, so a
 * toll can never be pinned to another tenant's truck.
 */
export async function assignTollToTruck(
  carrierId: string,
  transactionId: string,
  truckId: string | null
): Promise<number> {
  if (truckId === null) {
    const res = await query(
      `UPDATE hub.toll_transactions SET truck_id = NULL
       WHERE carrier_id = $1 AND id = $2 RETURNING id`,
      [carrierId, transactionId]
    )
    return res.length
  }
  const res = await query(
    `UPDATE hub.toll_transactions x SET truck_id = t.id
     FROM hub.trucks t
     WHERE x.carrier_id = $1 AND x.id = $2
       AND t.id = $3 AND t.carrier_id = $1 AND t.deleted_at IS NULL
     RETURNING x.id`,
    [carrierId, transactionId, truckId]
  )
  return res.length
}

export interface TollTruckStats {
  truck_id: string | null
  truck_unit: string | null
  transactions: number
  total_cents: string
}

/** Per-truck toll spend over a window, used for the reconciliation dashboard and truck P&L. */
export async function tollStatsByTruck(carrierId: string, days = 92): Promise<TollTruckStats[]> {
  return query<TollTruckStats>(
    `SELECT x.truck_id, t.unit_number AS truck_unit,
       COUNT(*)::int AS transactions,
       SUM(x.amount_cents) AS total_cents
     FROM hub.toll_transactions x
     LEFT JOIN hub.trucks t ON t.id = x.truck_id AND t.carrier_id = x.carrier_id
     WHERE x.carrier_id = $1 AND x.ts >= NOW() - ($2 || ' days')::interval
     GROUP BY x.truck_id, t.unit_number
     ORDER BY t.unit_number NULLS LAST`,
    [carrierId, days]
  )
}
