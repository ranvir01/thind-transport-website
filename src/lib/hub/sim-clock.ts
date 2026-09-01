/**
 * Light living-simulation clock: bump sim_clock_date, progress a few in-flight
 * loads, drop a new "today" booked load, nudge ELD pings, and re-age AR.
 * Inputs only — money engines are not bypassed.
 */
import { query, queryOne } from "./db"
import { getSimClockDate, recordSimSeed, setSimClockDate, isSimulation } from "./mode"

const CHAIN = ["booked", "dispatched", "at_pickup", "in_transit", "delivered", "pod_received"]

function nextStatus(current: string): string | null {
  const i = CHAIN.indexOf(current)
  if (i < 0 || i >= CHAIN.length - 1) return null
  return CHAIN[i + 1]
}

export async function advanceSimulatedDay(carrierId: string): Promise<{ date: string; moved: number; pings: number }> {
  if (!(await isSimulation())) throw new Error("Not in simulation")
  const clock = await getSimClockDate()
  clock.setUTCDate(clock.getUTCDate() + 1)
  const date = clock.toISOString().slice(0, 10)
  await setSimClockDate(date)

  const loads = await query<{ id: string; status: string; reference: string }>(
    `SELECT id, status, reference FROM hub.loads
     WHERE carrier_id = $1 AND deleted_at IS NULL
       AND status = ANY($2)
     ORDER BY created_at
     LIMIT 4`,
    [carrierId, CHAIN]
  )
  let moved = 0
  for (const load of loads) {
    const next = nextStatus(load.status)
    if (!next) continue
    await query(
      `UPDATE hub.loads SET status = $3, updated_at = NOW() WHERE carrier_id = $1 AND id = $2`,
      [carrierId, load.id, next]
    )
    await query(
      `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_name, payload)
       VALUES ($1, $2, 'status_change', 'Simulated clock', $3)`,
      [carrierId, load.id, JSON.stringify({ from: load.status, to: next, simClock: date })]
    )
    moved++
  }

  // Nudge the newest ping per in-transit truck a few miles south.
  const trucks = await query<{ id: string; lat: number; lng: number }>(
    `SELECT DISTINCT ON (t.id) t.id, p.lat, p.lng
     FROM hub.trucks t
     JOIN hub.position_pings p ON p.truck_id = t.id AND p.carrier_id = t.carrier_id
     JOIN hub.loads l ON l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.status = 'in_transit'
     WHERE t.carrier_id = $1
     ORDER BY t.id, p.ts DESC`,
    [carrierId]
  )
  let pings = 0
  for (const truck of trucks) {
    await query(
      `INSERT INTO hub.position_pings (carrier_id, truck_id, ts, lat, lng, source)
       VALUES ($1, $2, NOW(), $3, $4, 'sim-clock')`,
      [carrierId, truck.id, truck.lat - 0.08, truck.lng + 0.04]
    )
    pings++
  }

  // Age AR: mark sent invoices past due as overdue.
  await query(
    `UPDATE hub.invoices SET status = 'overdue', updated_at = NOW()
     WHERE carrier_id = $1 AND status = 'sent' AND due_on < $2::date`,
    [carrierId, date]
  )

  // Surface a new "today" quoted/booked load if the board is thin.
  const open = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM hub.loads
     WHERE carrier_id = $1 AND deleted_at IS NULL AND status IN ('quoted','booked')`,
    [carrierId]
  )
  if (Number(open?.n ?? 0) < 2) {
    const customer = await queryOne<{ id: string }>(
      `SELECT id FROM hub.customers WHERE carrier_id = $1 AND status = 'active' LIMIT 1`,
      [carrierId]
    )
    if (customer) {
      const ref = `SIM-${date.replace(/-/g, "").slice(4)}-${Math.floor(Math.random() * 90 + 10)}`
      await query(
        `INSERT INTO hub.loads (carrier_id, reference, customer_id, status, equipment, commodity,
           linehaul_cents, fuel_surcharge_cents, loaded_miles, deadhead_miles, source)
         VALUES ($1,$2,$3,'booked','dry_van','Simulated freight',185000,18000,420,35,'direct')`,
        [carrierId, ref, customer.id]
      )
    }
  }

  const seedRow = await queryOne<{ sim_seed: string | null }>(
    `SELECT sim_seed FROM hub.platform_state WHERE id = 1`
  )
  if (seedRow?.sim_seed) await recordSimSeed(seedRow.sim_seed, date)

  return { date, moved, pings }
}
