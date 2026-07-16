/**
 * The Today command center (E1): the complete morning huddle with zero
 * clicks. Every item links one tap into the fix.
 */
import { query } from "./db"
import { complianceEntries, type ComplianceEntry } from "./compliance"
import { listTimeOff } from "./timeoff"
import type { Task, TimeOffRequest } from "./types"

export interface TodayStop {
  stop_id: string
  load_id: string
  reference: string
  type: "pickup" | "delivery"
  facility: string | null
  city: string
  state: string
  appt_start: string | null
  appt_end: string | null
  fcfs: boolean
  arrived_at: string | null
  driver_name: string | null
  truck_unit: string | null
  status: string
}

export interface TodayTruck {
  id: string
  unit_number: string
  driver_name: string | null
  when: "now" | "today" | "tomorrow"
  where_city: string | null
  where_state: string | null
}

export interface UnackedDispatch {
  id: string
  reference: string
  driver_name: string | null
  dispatched_at: string
  origin_city: string | null
  dest_city: string | null
}

export interface UnbilledLoad {
  id: string
  reference: string
  customer_name: string | null
  total_cents: number
  delivered_days_ago: number
}

export interface TodayData {
  stopsToday: TodayStop[]
  emptyTrucks: TodayTruck[]
  unacked: UnackedDispatch[]
  redCompliance: ComplianceEntry[]
  tasksDue: Task[]
  unbilled: UnbilledLoad[]
  pendingTimeOff: TimeOffRequest[]
  openIncidents: number
  /** Invoices sent but unpaid for 30+ days — the cash-flow nudge. */
  arOverdue: { count: number; cents: number }
}

export async function todayData(carrierId: string): Promise<TodayData> {
  const [stopsToday, emptyNow, emptySoon, unacked, compliance, tasksDue, unbilled, pendingTimeOff, incidents, arOverdueRows] =
    await Promise.all([
      // Pickups & deliveries with an appointment today (or FCFS on active loads today).
      query<TodayStop>(
        `SELECT s.id AS stop_id, l.id AS load_id, l.reference, s.type, s.facility, s.city, s.state,
           s.appt_start, s.appt_end, s.fcfs, s.arrived_at, l.status,
           d.first_name || ' ' || d.last_name AS driver_name, t.unit_number AS truck_unit
         FROM hub.stops s
         JOIN hub.loads l ON l.id = s.load_id
         LEFT JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = l.carrier_id
         LEFT JOIN hub.trucks t ON t.id = l.truck_id AND t.carrier_id = l.carrier_id
         WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
           AND l.status IN ('booked','dispatched','at_pickup','in_transit')
           AND s.appt_start >= date_trunc('day', NOW())
           AND s.appt_start < date_trunc('day', NOW()) + INTERVAL '1 day'
         ORDER BY s.appt_start`,
        [carrierId]
      ),
      // Trucks with no active load at all.
      query<{ id: string; unit_number: string; driver_name: string | null; where_city: string | null; where_state: string | null }>(
        `SELECT t.id, t.unit_number, d.first_name || ' ' || d.last_name AS driver_name,
           lp.city AS where_city, lp.state AS where_state
         FROM hub.trucks t
         LEFT JOIN hub.drivers d ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id
         LEFT JOIN LATERAL (
           SELECT s.city, s.state FROM hub.stops s JOIN hub.loads l ON l.id = s.load_id
           WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id
             AND s.type = 'delivery' AND s.departed_at IS NOT NULL
           ORDER BY s.departed_at DESC LIMIT 1
         ) lp ON TRUE
         WHERE t.carrier_id = $1 AND t.deleted_at IS NULL AND t.status = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM hub.loads l WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id
               AND l.deleted_at IS NULL
               AND l.status IN ('booked','dispatched','at_pickup','in_transit')
           )
         ORDER BY t.unit_number`,
        [carrierId]
      ),
      // Trucks delivering their last active load within ~36 hours.
      query<{ id: string; unit_number: string; driver_name: string | null; where_city: string | null; where_state: string | null; final_at: string }>(
        `SELECT t.id, t.unit_number, d.first_name || ' ' || d.last_name AS driver_name,
           fin.city AS where_city, fin.state AS where_state, fin.final_at
         FROM hub.trucks t
         LEFT JOIN hub.drivers d ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id
         JOIN LATERAL (
           SELECT s.city, s.state, COALESCE(s.appt_end, s.appt_start) AS final_at
           FROM hub.stops s JOIN hub.loads l ON l.id = s.load_id
           WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL
             AND l.status IN ('dispatched','at_pickup','in_transit')
             AND s.type = 'delivery'
           ORDER BY COALESCE(s.appt_end, s.appt_start) DESC LIMIT 1
         ) fin ON TRUE
         WHERE t.carrier_id = $1 AND t.deleted_at IS NULL AND t.status = 'active'
           AND fin.final_at < NOW() + INTERVAL '36 hours'
           AND NOT EXISTS (
             SELECT 1 FROM hub.loads nl
             JOIN LATERAL (SELECT MIN(appt_start) AS next_pickup FROM hub.stops WHERE load_id = nl.id AND carrier_id = nl.carrier_id AND type = 'pickup') np ON TRUE
             WHERE nl.truck_id = t.id AND nl.carrier_id = t.carrier_id AND nl.deleted_at IS NULL AND nl.status IN ('quoted','booked')
               AND np.next_pickup > NOW()
           )
         ORDER BY fin.final_at`,
        [carrierId]
      ),
      // Dispatches the driver hasn't confirmed.
      query<UnackedDispatch>(
        `SELECT l.id, l.reference, d.first_name || ' ' || d.last_name AS driver_name,
           l.updated_at AS dispatched_at,
           fs.city AS origin_city, ls.city AS dest_city
         FROM hub.loads l
         LEFT JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = l.carrier_id
         LEFT JOIN LATERAL (SELECT city FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'pickup' ORDER BY sequence LIMIT 1) fs ON TRUE
         LEFT JOIN LATERAL (SELECT city FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'delivery' ORDER BY sequence DESC LIMIT 1) ls ON TRUE
         WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status = 'dispatched'
           AND l.acknowledged_at IS NULL
         ORDER BY l.updated_at`,
        [carrierId]
      ),
      complianceEntries(carrierId),
      query<Task>(
        `SELECT t.*, u.name AS assignee_name FROM hub.tasks t
         LEFT JOIN hub.users u ON u.id = t.assignee_user_id AND u.carrier_id = t.carrier_id
         WHERE t.carrier_id = $1 AND t.completed_at IS NULL
           AND (t.due_at < date_trunc('day', NOW()) + INTERVAL '1 day' OR t.priority = 'urgent')
         ORDER BY t.due_at ASC NULLS LAST LIMIT 12`,
        [carrierId]
      ),
      query<UnbilledLoad>(
        `SELECT l.id, l.reference, c.name AS customer_name,
           (l.linehaul_cents + l.fuel_surcharge_cents +
            COALESCE((SELECT SUM((a->>'amount_cents')::bigint) FROM jsonb_array_elements(l.accessorials) a), 0))::bigint AS total_cents,
           GREATEST(0, EXTRACT(DAY FROM NOW() - l.updated_at))::int AS delivered_days_ago
         FROM hub.loads l
         LEFT JOIN hub.customers c ON c.id = l.customer_id AND c.carrier_id = l.carrier_id
         WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status = 'pod_received'
           AND NOT EXISTS (SELECT 1 FROM hub.invoices i WHERE i.load_id = l.id AND i.carrier_id = l.carrier_id)
         ORDER BY l.updated_at`,
        [carrierId]
      ),
      listTimeOff(carrierId, { status: "requested" }),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM hub.incidents WHERE carrier_id = $1 AND status <> 'closed'`,
        [carrierId]
      ),
      query<{ count: string; cents: string }>(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS cents
         FROM hub.invoices
         WHERE carrier_id = $1 AND status IN ('sent','partial','overdue','disputed')
           AND issued_on < (NOW() - INTERVAL '30 days')::date`,
        [carrierId]
      ),
    ])

  const emptyTrucks: TodayTruck[] = [
    ...emptyNow.map((t) => ({ ...t, when: "now" as const })),
    ...emptySoon.map((t) => ({
      id: t.id,
      unit_number: t.unit_number,
      driver_name: t.driver_name,
      where_city: t.where_city,
      where_state: t.where_state,
      when: (new Date(t.final_at).getDate() === new Date().getDate() ? "today" : "tomorrow") as "today" | "tomorrow",
    })),
  ]

  return {
    stopsToday,
    emptyTrucks,
    unacked,
    redCompliance: compliance.filter((c) => c.color === "red"),
    tasksDue: tasksDue,
    unbilled,
    pendingTimeOff,
    openIncidents: Number(incidents[0]?.count ?? 0),
    arOverdue: {
      count: Number(arOverdueRows[0]?.count ?? 0),
      cents: Number(arOverdueRows[0]?.cents ?? 0),
    },
  }
}
