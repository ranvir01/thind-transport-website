/**
 * Planner board (E1): how dispatchers actually think — one row per truck,
 * seven day columns, loads as blocks spanning pickup→delivery, drag to
 * assign/reschedule, time-off blocks, availability forecasts, backhaul hints.
 */
import { query } from "./db"
import { haversineMiles } from "./geo"
import { lanesOutOf } from "./lanes"
import { approvedTimeOffInWindow } from "./timeoff"
import type { Lane, TimeOffRequest } from "./types"

export interface PlannerBlock {
  id: string
  reference: string
  status: string
  customer_name: string | null
  equipment: string
  truck_id: string | null
  driver_id: string | null
  driver_name: string | null
  origin_city: string | null
  origin_state: string | null
  dest_city: string | null
  dest_state: string | null
  /** ISO timestamps bounding the block (first pickup → last delivery). */
  starts_at: string
  ends_at: string
  acknowledged_at: string | null
}

export interface PlannerTruck {
  id: string
  unit_number: string
  status: string
  driver_id: string | null
  driver_name: string | null
  /** "Empty in Boise, ID ~ Thu 14:00" — last delivery + drive-time estimate. */
  forecast: string | null
  /** Empty (no active load) right now. */
  empty_now: boolean
  /** Market the truck goes/is empty in, for backhaul hints. */
  empty_state: string | null
  empty_city: string | null
}

export interface PlannerData {
  weekStart: string
  days: string[]
  trucks: PlannerTruck[]
  blocks: PlannerBlock[]
  unassigned: PlannerBlock[]
  timeOff: TimeOffRequest[]
  backhaul: { truckUnit: string; market: string; lanes: Lane[] }[]
}

/** Monday of the week containing `date` (date-only, local). */
export function weekStartOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

const ACTIVE_BLOCK_STATUSES = ["quoted", "booked", "dispatched", "at_pickup", "in_transit", "delivered"]

const BLOCK_SELECT = `
  SELECT l.id, l.reference, l.status, l.equipment, l.truck_id, l.driver_id, l.acknowledged_at,
    c.name AS customer_name,
    d.first_name || ' ' || d.last_name AS driver_name,
    fs.city AS origin_city, fs.state AS origin_state,
    ls.city AS dest_city, ls.state AS dest_state,
    COALESCE(fs.appt_start, l.created_at) AS starts_at,
    COALESCE(ls.appt_end, ls.appt_start, fs.appt_start + INTERVAL '1 day', l.created_at + INTERVAL '1 day') AS ends_at
  FROM hub.loads l
  LEFT JOIN hub.customers c ON c.id = l.customer_id AND c.carrier_id = l.carrier_id
  LEFT JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = l.carrier_id
  LEFT JOIN LATERAL (SELECT * FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'pickup' ORDER BY sequence LIMIT 1) fs ON TRUE
  LEFT JOIN LATERAL (SELECT * FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'delivery' ORDER BY sequence DESC LIMIT 1) ls ON TRUE`

export async function plannerData(carrierId: string, weekStartISO?: string): Promise<PlannerData> {
  const weekStart = weekStartISO
    ? new Date(`${weekStartISO}T00:00:00`)
    : weekStartOf(new Date())
  const weekEnd = new Date(weekStart.getTime())
  weekEnd.setDate(weekEnd.getDate() + 7)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime())
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  const [trucksRaw, blocksRaw, timeOff] = await Promise.all([
    query<{
      id: string; unit_number: string; status: string
      driver_id: string | null; driver_name: string | null
    }>(
      `SELECT t.id, t.unit_number, t.status, t.assigned_driver_id AS driver_id,
         d.first_name || ' ' || d.last_name AS driver_name
       FROM hub.trucks t LEFT JOIN hub.drivers d ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id
       WHERE t.carrier_id = $1 AND t.deleted_at IS NULL AND t.status <> 'retired'
       ORDER BY t.unit_number`,
      [carrierId]
    ),
    query<PlannerBlock>(
      `${BLOCK_SELECT}
       WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
         AND l.status = ANY($2)
         AND COALESCE(fs.appt_start, l.created_at) < $4
         AND COALESCE(ls.appt_end, ls.appt_start, fs.appt_start + INTERVAL '1 day', l.created_at + INTERVAL '1 day') > $3
       ORDER BY starts_at`,
      [carrierId, ACTIVE_BLOCK_STATUSES, weekStart.toISOString(), weekEnd.toISOString()]
    ),
    approvedTimeOffInWindow(carrierId, days[0], days[6]),
  ])

  const blocks = blocksRaw.filter((b) => b.truck_id)
  const unassigned = blocksRaw.filter((b) => !b.truck_id)

  // Availability forecast per truck: where + when it goes empty.
  const trucks: PlannerTruck[] = []
  const backhaul: PlannerData["backhaul"] = []
  for (const truck of trucksRaw) {
    const truckBlocks = blocks
      .filter((b) => b.truck_id === truck.id && b.status !== "delivered")
      .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())
    const lastBlock = truckBlocks[truckBlocks.length - 1]
    let forecast: string | null = null
    let emptyState: string | null = null
    let emptyCity: string | null = null
    const emptyNow = !lastBlock

    if (lastBlock) {
      const eta = await emptyEta(carrierId, truck.id, lastBlock)
      emptyState = lastBlock.dest_state
      emptyCity = lastBlock.dest_city
      forecast = `Empty in ${lastBlock.dest_city ?? "?"}, ${lastBlock.dest_state ?? ""} ~ ${eta.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}`
    } else {
      // Empty now: where did it last deliver?
      const lastDelivery = await query<{ city: string; state: string }>(
        `SELECT s.city, s.state FROM hub.stops s
         JOIN hub.loads l ON l.id = s.load_id AND l.carrier_id = s.carrier_id
         WHERE l.carrier_id = $1 AND l.truck_id = $2 AND s.type = 'delivery' AND s.departed_at IS NOT NULL
         ORDER BY s.departed_at DESC LIMIT 1`,
        [carrierId, truck.id]
      )
      emptyState = lastDelivery[0]?.state ?? null
      emptyCity = lastDelivery[0]?.city ?? null
      forecast = emptyCity ? `Empty now in ${emptyCity}, ${emptyState}` : "Empty now"
    }

    trucks.push({
      ...truck,
      forecast,
      empty_now: emptyNow,
      empty_state: emptyState,
      empty_city: emptyCity,
    })

    if (truck.status === "active" && emptyState) {
      const lanes = await lanesOutOf(carrierId, emptyState, 3)
      if (lanes.length > 0) {
        backhaul.push({ truckUnit: truck.unit_number, market: `${emptyCity ?? emptyState}, ${emptyState}`, lanes })
      }
    }
  }

  return {
    weekStart: days[0],
    days,
    trucks,
    blocks,
    unassigned,
    timeOff,
    backhaul,
  }
}

/**
 * When does this truck go empty? Last delivery appointment, or — if the load
 * is rolling and we know the truck's position — a drive-time estimate
 * (haversine × 1.2 road factor ÷ 47 mph average, clearly an estimate).
 */
async function emptyEta(
  carrierId: string,
  truckId: string,
  lastBlock: PlannerBlock
): Promise<Date> {
  const apptEnd = new Date(lastBlock.ends_at)
  if (lastBlock.status !== "in_transit") return apptEnd

  const [ping] = await query<{ lat: number; lng: number; ts: string }>(
    `SELECT lat, lng, ts FROM hub.position_pings
     WHERE carrier_id = $1 AND truck_id = $2 ORDER BY ts DESC LIMIT 1`,
    [carrierId, truckId]
  )
  const [destStop] = await query<{ lat: number | null; lng: number | null }>(
    `SELECT s.lat, s.lng FROM hub.stops s
     WHERE s.load_id = $1 AND s.type = 'delivery' ORDER BY s.sequence DESC LIMIT 1`,
    [lastBlock.id]
  )
  if (!ping || destStop?.lat == null || destStop?.lng == null) return apptEnd

  const miles = haversineMiles(ping.lat, ping.lng, destStop.lat, destStop.lng) * 1.2
  const driveHours = miles / 47
  const eta = new Date(new Date(ping.ts).getTime() + driveHours * 3600_000)
  // Whichever is later: the appointment or the physics.
  return eta > apptEnd ? eta : apptEnd
}
