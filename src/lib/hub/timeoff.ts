/**
 * Time-off / home-time requests (E5): drivers ask from their phone, the
 * office approves, and approved time blocks the planner grid (E1) so
 * dispatch never books over a kid's birthday.
 */
import { query, queryOne } from "./db"
import type { TimeOffRequest } from "./types"

const SELECT = `
  SELECT r.*, d.first_name || ' ' || d.last_name AS driver_name
  FROM hub.time_off_requests r
  JOIN hub.drivers d ON d.id = r.driver_id`

export async function listTimeOff(
  carrierId: string,
  filters: { driverId?: string; status?: string; from?: string } = {}
): Promise<TimeOffRequest[]> {
  const params: unknown[] = [carrierId]
  let where = `r.carrier_id = $1`
  if (filters.driverId) {
    params.push(filters.driverId)
    where += ` AND r.driver_id = $${params.length}`
  }
  if (filters.status) {
    params.push(filters.status)
    where += ` AND r.status = $${params.length}`
  }
  if (filters.from) {
    params.push(filters.from)
    where += ` AND r.end_date >= $${params.length}`
  }
  return query<TimeOffRequest>(`${SELECT} WHERE ${where} ORDER BY r.start_date DESC LIMIT 200`, params)
}

export async function createTimeOffRequest(
  carrierId: string,
  driverId: string,
  input: { startDate: string; endDate: string; kind: string; reason?: string | null }
): Promise<TimeOffRequest> {
  const rows = await query<TimeOffRequest>(
    `INSERT INTO hub.time_off_requests (carrier_id, driver_id, start_date, end_date, kind, reason)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [carrierId, driverId, input.startDate, input.endDate, input.kind, input.reason ?? null]
  )
  return rows[0]
}

export async function decideTimeOff(
  carrierId: string,
  id: string,
  decision: "approved" | "denied",
  decider: { id: string; name: string }
): Promise<TimeOffRequest | null> {
  const rows = await query<TimeOffRequest>(
    `UPDATE hub.time_off_requests
     SET status = $3, decided_by = $4, decided_by_name = $5, decided_at = NOW()
     WHERE carrier_id = $1 AND id = $2 AND status = 'requested'
     RETURNING *`,
    [carrierId, id, decision, decider.id, decider.name]
  )
  return rows[0] ?? null
}

export async function cancelTimeOff(
  carrierId: string,
  id: string,
  driverId: string
): Promise<boolean> {
  const rows = await query(
    `UPDATE hub.time_off_requests SET status = 'cancelled'
     WHERE carrier_id = $1 AND id = $2 AND driver_id = $3 AND status IN ('requested','approved')
     RETURNING id`,
    [carrierId, id, driverId]
  )
  return rows.length > 0
}

/** Approved blocks overlapping a date window — the planner paints these. */
export async function approvedTimeOffInWindow(
  carrierId: string,
  startDate: string,
  endDate: string
): Promise<TimeOffRequest[]> {
  return query<TimeOffRequest>(
    `${SELECT}
     WHERE r.carrier_id = $1 AND r.status = 'approved'
       AND r.start_date <= $3 AND r.end_date >= $2
     ORDER BY r.start_date`,
    [carrierId, startDate, endDate]
  )
}

/** Legality check: is this driver on approved time off on any day in [start, end]? */
export async function driverTimeOffConflict(
  carrierId: string,
  driverId: string,
  startDate: string,
  endDate: string
): Promise<TimeOffRequest | null> {
  return queryOne<TimeOffRequest>(
    `${SELECT}
     WHERE r.carrier_id = $1 AND r.driver_id = $2 AND r.status = 'approved'
       AND r.start_date <= $4 AND r.end_date >= $3
     LIMIT 1`,
    [carrierId, driverId, startDate, endDate]
  )
}
