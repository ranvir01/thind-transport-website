import { hubDb, query, queryOne } from "./db"
import { facilityDedupeKey } from "./facilities"
import { notifyDriver } from "./notify"
import { assertCarrierRefs } from "./tenancy"
import type {
  Accessorial, EquipmentType, Load, LoadEvent, LoadEventKind, LoadStatus, Stop,
} from "./types"

const LOAD_SELECT = `
  SELECT l.*,
    c.name AS customer_name,
    d.first_name || ' ' || d.last_name AS driver_name,
    t.unit_number AS truck_unit,
    tr.unit_number AS trailer_unit,
    fs.city AS origin_city, fs.state AS origin_state,
    fs.appt_start AS pickup_appt,
    ls.city AS dest_city, ls.state AS dest_state,
    ls.appt_start AS delivery_appt,
    docs.kinds AS doc_kinds,
    inv.id AS invoice_id, inv.status AS invoice_status
  FROM hub.loads l
  LEFT JOIN hub.customers c ON c.id = l.customer_id AND c.carrier_id = l.carrier_id
  LEFT JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = l.carrier_id
  LEFT JOIN hub.trucks t ON t.id = l.truck_id AND t.carrier_id = l.carrier_id
  LEFT JOIN hub.trailers tr ON tr.id = l.trailer_id AND tr.carrier_id = l.carrier_id
  LEFT JOIN LATERAL (
    SELECT city, state, appt_start FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'pickup'
    ORDER BY sequence ASC LIMIT 1
  ) fs ON TRUE
  LEFT JOIN LATERAL (
    SELECT city, state, appt_start FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'delivery'
    ORDER BY sequence DESC LIMIT 1
  ) ls ON TRUE
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(DISTINCT kind) AS kinds FROM hub.documents
    WHERE entity_type = 'load' AND entity_id = l.id AND carrier_id = l.carrier_id
  ) docs ON TRUE
  LEFT JOIN LATERAL (
    SELECT id, status FROM hub.invoices WHERE load_id = l.id AND carrier_id = l.carrier_id
    ORDER BY created_at DESC LIMIT 1
  ) inv ON TRUE
`

export interface LoadFilters {
  status?: LoadStatus | "active" | "all"
  customerId?: string
  driverId?: string
  truckId?: string
  search?: string
}

export async function listLoads(carrierId: string, filters: LoadFilters = {}): Promise<Load[]> {
  const params: unknown[] = [carrierId]
  const clauses: string[] = ["l.deleted_at IS NULL", "l.carrier_id = $1"]

  if (filters.status && filters.status !== "all") {
    if (filters.status === "active") {
      clauses.push(`l.status NOT IN ('settled','cancelled')`)
    } else {
      params.push(filters.status)
      clauses.push(`l.status = $${params.length}`)
    }
  }
  if (filters.customerId) {
    params.push(filters.customerId)
    clauses.push(`l.customer_id = $${params.length}`)
  }
  if (filters.driverId) {
    params.push(filters.driverId)
    clauses.push(`l.driver_id = $${params.length}`)
  }
  if (filters.truckId) {
    params.push(filters.truckId)
    clauses.push(`l.truck_id = $${params.length}`)
  }
  if (filters.search) {
    params.push(`%${filters.search}%`)
    const p = `$${params.length}`
    clauses.push(
      `(l.reference ILIKE ${p} OR l.customer_reference ILIKE ${p} OR c.name ILIKE ${p}
        OR l.commodity ILIKE ${p} OR fs.city ILIKE ${p} OR ls.city ILIKE ${p})`
    )
  }

  return query<Load>(
    `${LOAD_SELECT} WHERE ${clauses.join(" AND ")} ORDER BY l.created_at DESC LIMIT 500`,
    params
  )
}

export async function getLoad(carrierId: string, id: string): Promise<Load | null> {
  return queryOne<Load>(
    `${LOAD_SELECT} WHERE l.id = $2 AND l.carrier_id = $1 AND l.deleted_at IS NULL`,
    [carrierId, id]
  )
}

export async function getLoadStops(carrierId: string, loadId: string): Promise<Stop[]> {
  return query<Stop>(
    `SELECT * FROM hub.stops WHERE carrier_id = $1 AND load_id = $2 ORDER BY sequence`,
    [carrierId, loadId]
  )
}

export async function getLoadEvents(carrierId: string, loadId: string): Promise<LoadEvent[]> {
  return query<LoadEvent>(
    `SELECT id, load_id, kind, actor_name, payload, created_at
     FROM hub.load_events WHERE carrier_id = $1 AND load_id = $2 ORDER BY created_at ASC, id ASC`,
    [carrierId, loadId]
  )
}

export async function addLoadEvent(
  carrierId: string,
  loadId: string,
  kind: LoadEventKind,
  payload: Record<string, unknown>,
  actor: { id?: string | null; name?: string | null }
): Promise<void> {
  await query(
    `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [carrierId, loadId, kind, actor.id ?? null, actor.name ?? null, JSON.stringify(payload)]
  )
}

export interface StopInput {
  type: "pickup" | "delivery"
  facility?: string | null
  address?: string | null
  city: string
  state: string
  zip?: string | null
  fcfs?: boolean
  pickup_number?: string | null
  po_number?: string | null
  appt_start?: string | null
  appt_end?: string | null
  lat?: number | null
  lng?: number | null
  notes?: string | null
}

export interface LoadInput {
  customer_id: string
  customer_reference?: string | null
  status?: LoadStatus
  equipment: EquipmentType
  commodity?: string | null
  weight_lbs?: number | null
  linehaul_cents: number
  fuel_surcharge_cents: number
  accessorials: Accessorial[]
  loaded_miles?: number | null
  deadhead_miles?: number | null
  truck_id?: string | null
  trailer_id?: string | null
  driver_id?: string | null
  source?: "dat" | "direct" | "import" | "quote" | "truckstop"
  factored?: boolean
  notes?: string | null
  stops: StopInput[]
}

async function insertStops(
  client: { query: (q: string, p?: unknown[]) => Promise<{ rows: { id: string }[] }> },
  carrierId: string,
  loadId: string,
  stops: StopInput[]
): Promise<void> {
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]
    // Facility intelligence (E2): every named stop links to its facility record
    // (deduped by geocode bucket) so dwell history and notes accumulate.
    let facilityId: string | null = null
    if (s.facility?.trim()) {
      const key = facilityDedupeKey({
        name: s.facility,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
        city: s.city,
        state: s.state,
      })
      const { rows } = await client.query(
        `INSERT INTO hub.facilities (carrier_id, name, dedupe_key, address, city, state, zip, lat, lng, type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (carrier_id, dedupe_key) DO UPDATE SET
           lat = COALESCE(hub.facilities.lat, EXCLUDED.lat),
           lng = COALESCE(hub.facilities.lng, EXCLUDED.lng),
           updated_at = NOW()
         RETURNING id`,
        [
          carrierId, s.facility.trim(), key, s.address ?? null, s.city, s.state, s.zip ?? null,
          s.lat ?? null, s.lng ?? null, s.type === "pickup" ? "shipper" : "receiver",
        ]
      )
      facilityId = rows[0]?.id ?? null
    }
    await client.query(
      `INSERT INTO hub.stops (carrier_id, load_id, sequence, type, facility, facility_id, address, city, state, zip,
         fcfs, pickup_number, po_number, appt_start, appt_end, lat, lng, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        carrierId, loadId, i + 1, s.type, s.facility ?? null, facilityId, s.address ?? null, s.city, s.state,
        s.zip ?? null, s.fcfs ?? false, s.pickup_number ?? null, s.po_number ?? null,
        s.appt_start ?? null, s.appt_end ?? null, s.lat ?? null, s.lng ?? null, s.notes ?? null,
      ]
    )
  }
}

export async function createLoad(
  carrierId: string,
  input: LoadInput,
  actor: { id?: string | null; name?: string | null }
): Promise<Load> {
  await assertCarrierRefs(carrierId, {
    customer_id: input.customer_id,
    driver_id: input.driver_id,
    truck_id: input.truck_id,
    trailer_id: input.trailer_id,
  })
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    const { rows: refRows } = await client.query(
      `SELECT MAX(SUBSTRING(reference FROM 5)::int)::text AS max_ref
       FROM hub.loads WHERE carrier_id = $1 AND reference ~ '^THD-[0-9]+$'`,
      [carrierId]
    )
    const reference = `THD-${Number(refRows[0]?.max_ref ?? 1000) + 1}`
    const status = input.status ?? "booked"
    const { rows } = await client.query(
      `INSERT INTO hub.loads (
         carrier_id, reference, customer_reference, customer_id, status, equipment, commodity, weight_lbs,
         linehaul_cents, fuel_surcharge_cents, accessorials, loaded_miles, deadhead_miles,
         truck_id, trailer_id, driver_id, dispatcher_id, source, factored, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        carrierId, reference, input.customer_reference ?? null, input.customer_id, status,
        input.equipment, input.commodity ?? null, input.weight_lbs ?? null,
        input.linehaul_cents, input.fuel_surcharge_cents, JSON.stringify(input.accessorials ?? []),
        input.loaded_miles ?? null, input.deadhead_miles ?? null,
        input.truck_id ?? null, input.trailer_id ?? null, input.driver_id ?? null,
        actor.id ?? null, input.source ?? "direct", input.factored ?? false, input.notes ?? null,
      ]
    )
    const load = rows[0]
    await insertStops(client, carrierId, load.id, input.stops)
    await client.query(
      `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
       VALUES ($1, $2, 'status_change', $3, $4, $5)`,
      [carrierId, load.id, actor.id ?? null, actor.name ?? null, JSON.stringify({ from: null, to: status })]
    )
    await client.query("COMMIT")
    return load as Load
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function updateLoad(
  carrierId: string,
  id: string,
  input: Omit<LoadInput, "stops" | "status">
): Promise<Load | null> {
  await assertCarrierRefs(carrierId, {
    customer_id: input.customer_id,
    driver_id: input.driver_id,
    truck_id: input.truck_id,
    trailer_id: input.trailer_id,
  })
  const rows = await query<Load>(
    `UPDATE hub.loads SET
       customer_reference=$3, customer_id=$4, equipment=$5, commodity=$6, weight_lbs=$7,
       linehaul_cents=$8, fuel_surcharge_cents=$9, accessorials=$10, loaded_miles=$11, deadhead_miles=$12,
       truck_id=$13, trailer_id=$14, driver_id=$15, factored=$16, notes=$17, updated_at=NOW()
     WHERE carrier_id=$1 AND id=$2 AND deleted_at IS NULL
     RETURNING *`,
    [
      carrierId, id, input.customer_reference ?? null, input.customer_id, input.equipment,
      input.commodity ?? null, input.weight_lbs ?? null, input.linehaul_cents, input.fuel_surcharge_cents,
      JSON.stringify(input.accessorials ?? []), input.loaded_miles ?? null,
      input.deadhead_miles ?? null, input.truck_id ?? null, input.trailer_id ?? null,
      input.driver_id ?? null, input.factored ?? false, input.notes ?? null,
    ]
  )
  return rows[0] ?? null
}

export async function changeLoadStatus(
  carrierId: string,
  id: string,
  toStatus: LoadStatus,
  actor: { id?: string | null; name?: string | null }
): Promise<Load | null> {
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    const { rows: current } = await client.query(
      `SELECT status FROM hub.loads WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [carrierId, id]
    )
    if (!current[0]) {
      await client.query("ROLLBACK")
      return null
    }
    const fromStatus = current[0].status as LoadStatus
    const { rows } = await client.query(
      `UPDATE hub.loads SET status = $3, updated_at = NOW() WHERE carrier_id = $1 AND id = $2 RETURNING *`,
      [carrierId, id, toStatus]
    )
    await client.query(
      `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
       VALUES ($1, $2, 'status_change', $3, $4, $5)`,
      [carrierId, id, actor.id ?? null, actor.name ?? null, JSON.stringify({ from: fromStatus, to: toStatus })]
    )
    await client.query("COMMIT")
    const load = rows[0] as Load
    // Best-effort: a driver push failure must never undo the status change
    // that already committed.
    if (toStatus === "dispatched" && fromStatus !== "dispatched" && load.driver_id) {
      try {
        await notifyDriver(carrierId, load.driver_id, {
          kind: "load_dispatched",
          title: `Load ${load.reference} dispatched to you`,
          body: "Check your driver app for stop details and paperwork.",
          link: "/hub/driver",
        })
      } catch (err) {
        console.error("dispatch notification failed:", err)
      }
    }
    return load
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function setStopTimestamp(
  carrierId: string,
  stopId: string,
  loadId: string,
  field: "arrived_at" | "departed_at",
  value: string | null
): Promise<Stop | null> {
  const column = field === "arrived_at" ? "arrived_at" : "departed_at"
  const rows = await query<Stop>(
    `UPDATE hub.stops SET ${column} = $4, updated_at = NOW()
     WHERE id = $2 AND load_id = $3 AND carrier_id = $1 RETURNING *`,
    [carrierId, stopId, loadId, value]
  )
  return rows[0] ?? null
}

export async function replaceStops(carrierId: string, loadId: string, stops: StopInput[]): Promise<void> {
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    await client.query(`DELETE FROM hub.stops WHERE load_id = $1 AND carrier_id = $2`, [loadId, carrierId])
    await insertStops(client, carrierId, loadId, stops)
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

// ---- Dashboard ----

export interface DashboardStats {
  active_loads: number
  in_transit: number
  awaiting_pod: number
  revenue_month_cents: string
  revenue_week_cents: string
  trucks_active: number
  trucks_total: number
  drivers_active: number
  ar_open_cents: string
  settlement_due_cents: string
}

export async function getDashboardStats(carrierId: string): Promise<DashboardStats> {
  const row = await queryOne<DashboardStats>(
    `
    SELECT
      (SELECT COUNT(*) FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL AND status NOT IN ('settled','cancelled','paid','invoiced','quoted'))::int AS active_loads,
      (SELECT COUNT(*) FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'in_transit')::int AS in_transit,
      (SELECT COUNT(*) FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'delivered')::int AS awaiting_pod,
      (SELECT COALESCE(SUM(linehaul_cents + fuel_surcharge_cents), 0) FROM hub.loads
        WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'cancelled'
        AND created_at >= date_trunc('month', NOW())) AS revenue_month_cents,
      (SELECT COALESCE(SUM(linehaul_cents + fuel_surcharge_cents), 0) FROM hub.loads
        WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'cancelled'
        AND created_at >= date_trunc('week', NOW())) AS revenue_week_cents,
      (SELECT COUNT(*) FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active')::int AS trucks_active,
      (SELECT COUNT(*) FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL)::int AS trucks_total,
      (SELECT COUNT(*) FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active')::int AS drivers_active,
      (SELECT COALESCE(SUM(i.amount_cents - COALESCE(p.paid, 0)), 0)
        FROM hub.invoices i
        LEFT JOIN LATERAL (SELECT SUM(amount_cents) AS paid FROM hub.payments WHERE invoice_id = i.id AND carrier_id = i.carrier_id) p ON TRUE
        WHERE i.carrier_id = $1 AND i.status NOT IN ('paid','disputed')) AS ar_open_cents,
      (SELECT COALESCE(SUM(net_cents), 0) FROM hub.settlements
        WHERE carrier_id = $1 AND status IN ('draft','approved')) AS settlement_due_cents
    `,
    [carrierId]
  )
  return row as DashboardStats
}

