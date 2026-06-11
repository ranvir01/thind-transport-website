import { hubDb, query, queryOne } from "./db"
import type { Accessorial, EquipmentType, Load, LoadStatus, Stop, StatusEvent } from "./types"

const LOAD_SELECT = `
  SELECT l.*,
    c.name AS customer_name,
    d.first_name || ' ' || d.last_name AS driver_name,
    t.unit_number AS truck_unit,
    tr.unit_number AS trailer_unit,
    fs.city AS origin_city, fs.state AS origin_state,
    ls.city AS dest_city, ls.state AS dest_state,
    docs.kinds AS doc_kinds
  FROM hub.loads l
  LEFT JOIN hub.customers c ON c.id = l.customer_id
  LEFT JOIN hub.drivers d ON d.id = l.driver_id
  LEFT JOIN hub.trucks t ON t.id = l.truck_id
  LEFT JOIN hub.trailers tr ON tr.id = l.trailer_id
  LEFT JOIN LATERAL (
    SELECT city, state FROM hub.stops WHERE load_id = l.id AND type = 'pickup'
    ORDER BY sequence ASC LIMIT 1
  ) fs ON TRUE
  LEFT JOIN LATERAL (
    SELECT city, state FROM hub.stops WHERE load_id = l.id AND type = 'delivery'
    ORDER BY sequence DESC LIMIT 1
  ) ls ON TRUE
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(DISTINCT kind) AS kinds FROM hub.documents
    WHERE entity_type = 'load' AND entity_id = l.id
  ) docs ON TRUE
`

export interface LoadFilters {
  status?: LoadStatus | "active" | "all"
  customerId?: string
  driverId?: string
  search?: string
}

export async function listLoads(filters: LoadFilters = {}): Promise<Load[]> {
  const clauses: string[] = ["l.deleted_at IS NULL"]
  const params: unknown[] = []

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

export async function getLoad(id: string): Promise<Load | null> {
  return queryOne<Load>(`${LOAD_SELECT} WHERE l.id = $1 AND l.deleted_at IS NULL`, [id])
}

export async function getLoadStops(loadId: string): Promise<Stop[]> {
  return query<Stop>(`SELECT * FROM hub.stops WHERE load_id = $1 ORDER BY sequence`, [loadId])
}

export async function getStatusEvents(loadId: string): Promise<StatusEvent[]> {
  return query<StatusEvent>(
    `SELECT * FROM hub.load_status_events WHERE load_id = $1 ORDER BY created_at ASC`,
    [loadId]
  )
}

export interface StopInput {
  type: "pickup" | "delivery"
  facility?: string | null
  address?: string | null
  city: string
  state: string
  zip?: string | null
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
  linehaul: number
  fuel_surcharge: number
  accessorials: Accessorial[]
  loaded_miles?: number | null
  deadhead_miles?: number | null
  truck_id?: string | null
  trailer_id?: string | null
  driver_id?: string | null
  source?: "dat" | "direct" | "import"
  notes?: string | null
  stops: StopInput[]
}

/** Generate the next THD-NNNN reference atomically. */
async function nextReference(client: { query: (q: string, p?: unknown[]) => Promise<{ rows: { max_ref: string | null }[] }> }): Promise<string> {
  const { rows } = await client.query(
    `SELECT MAX(SUBSTRING(reference FROM 5)::int)::text AS max_ref
     FROM hub.loads WHERE reference ~ '^THD-[0-9]+$'`
  )
  const next = (Number(rows[0]?.max_ref ?? 1000) + 1).toString()
  return `THD-${next}`
}

export async function createLoad(
  input: LoadInput,
  actor: { id?: string | null; name?: string | null }
): Promise<Load> {
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    const reference = await nextReference(client)
    const status = input.status ?? "booked"
    const { rows } = await client.query(
      `INSERT INTO hub.loads (
         reference, customer_reference, customer_id, status, equipment, commodity, weight_lbs,
         linehaul, fuel_surcharge, accessorials, loaded_miles, deadhead_miles,
         truck_id, trailer_id, driver_id, dispatcher_id, source, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        reference, input.customer_reference ?? null, input.customer_id, status,
        input.equipment, input.commodity ?? null, input.weight_lbs ?? null,
        input.linehaul, input.fuel_surcharge, JSON.stringify(input.accessorials ?? []),
        input.loaded_miles ?? null, input.deadhead_miles ?? null,
        input.truck_id ?? null, input.trailer_id ?? null, input.driver_id ?? null,
        actor.id ?? null, input.source ?? "direct", input.notes ?? null,
      ]
    )
    const load = rows[0]

    for (let i = 0; i < input.stops.length; i++) {
      const s = input.stops[i]
      await client.query(
        `INSERT INTO hub.stops (load_id, sequence, type, facility, address, city, state, zip,
           appt_start, appt_end, lat, lng, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          load.id, i + 1, s.type, s.facility ?? null, s.address ?? null, s.city, s.state,
          s.zip ?? null, s.appt_start ?? null, s.appt_end ?? null, s.lat ?? null, s.lng ?? null,
          s.notes ?? null,
        ]
      )
    }

    await client.query(
      `INSERT INTO hub.load_status_events (load_id, from_status, to_status, actor_id, actor_name)
       VALUES ($1, NULL, $2, $3, $4)`,
      [load.id, status, actor.id ?? null, actor.name ?? null]
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
  id: string,
  input: Omit<LoadInput, "stops" | "status">
): Promise<Load | null> {
  const rows = await query<Load>(
    `UPDATE hub.loads SET
       customer_reference=$2, customer_id=$3, equipment=$4, commodity=$5, weight_lbs=$6,
       linehaul=$7, fuel_surcharge=$8, accessorials=$9, loaded_miles=$10, deadhead_miles=$11,
       truck_id=$12, trailer_id=$13, driver_id=$14, notes=$15, updated_at=NOW()
     WHERE id=$1 AND deleted_at IS NULL
     RETURNING *`,
    [
      id, input.customer_reference ?? null, input.customer_id, input.equipment,
      input.commodity ?? null, input.weight_lbs ?? null, input.linehaul, input.fuel_surcharge,
      JSON.stringify(input.accessorials ?? []), input.loaded_miles ?? null,
      input.deadhead_miles ?? null, input.truck_id ?? null, input.trailer_id ?? null,
      input.driver_id ?? null, input.notes ?? null,
    ]
  )
  return rows[0] ?? null
}

export async function changeLoadStatus(
  id: string,
  toStatus: LoadStatus,
  actor: { id?: string | null; name?: string | null }
): Promise<Load | null> {
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    const { rows: current } = await client.query(
      `SELECT status FROM hub.loads WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id]
    )
    if (!current[0]) {
      await client.query("ROLLBACK")
      return null
    }
    const fromStatus = current[0].status as LoadStatus
    const { rows } = await client.query(
      `UPDATE hub.loads SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, toStatus]
    )
    await client.query(
      `INSERT INTO hub.load_status_events (load_id, from_status, to_status, actor_id, actor_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, fromStatus, toStatus, actor.id ?? null, actor.name ?? null]
    )
    await client.query("COMMIT")
    return rows[0] as Load
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function setStopTimestamp(
  stopId: string,
  field: "arrived_at" | "departed_at",
  value: string | null
): Promise<Stop | null> {
  const column = field === "arrived_at" ? "arrived_at" : "departed_at"
  const rows = await query<Stop>(
    `UPDATE hub.stops SET ${column} = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [stopId, value]
  )
  return rows[0] ?? null
}

export async function replaceStops(loadId: string, stops: StopInput[]): Promise<void> {
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    await client.query(`DELETE FROM hub.stops WHERE load_id = $1`, [loadId])
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]
      await client.query(
        `INSERT INTO hub.stops (load_id, sequence, type, facility, address, city, state, zip,
           appt_start, appt_end, lat, lng, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          loadId, i + 1, s.type, s.facility ?? null, s.address ?? null, s.city, s.state,
          s.zip ?? null, s.appt_start ?? null, s.appt_end ?? null, s.lat ?? null, s.lng ?? null,
          s.notes ?? null,
        ]
      )
    }
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
  revenue_month: string
  revenue_week: string
  trucks_active: number
  trucks_total: number
  drivers_active: number
  expiring_30: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const row = await queryOne<DashboardStats>(`
    SELECT
      (SELECT COUNT(*) FROM hub.loads WHERE deleted_at IS NULL AND status NOT IN ('settled','cancelled','paid','invoiced','quoted'))::int AS active_loads,
      (SELECT COUNT(*) FROM hub.loads WHERE deleted_at IS NULL AND status = 'in_transit')::int AS in_transit,
      (SELECT COUNT(*) FROM hub.loads WHERE deleted_at IS NULL AND status = 'delivered')::int AS awaiting_pod,
      (SELECT COALESCE(SUM(linehaul + fuel_surcharge), 0) FROM hub.loads
        WHERE deleted_at IS NULL AND status <> 'cancelled'
        AND created_at >= date_trunc('month', NOW())) AS revenue_month,
      (SELECT COALESCE(SUM(linehaul + fuel_surcharge), 0) FROM hub.loads
        WHERE deleted_at IS NULL AND status <> 'cancelled'
        AND created_at >= date_trunc('week', NOW())) AS revenue_week,
      (SELECT COUNT(*) FROM hub.trucks WHERE deleted_at IS NULL AND status = 'active')::int AS trucks_active,
      (SELECT COUNT(*) FROM hub.trucks WHERE deleted_at IS NULL)::int AS trucks_total,
      (SELECT COUNT(*) FROM hub.drivers WHERE deleted_at IS NULL AND status = 'active')::int AS drivers_active,
      (
        (SELECT COUNT(*) FROM hub.drivers WHERE deleted_at IS NULL AND status = 'active'
          AND (cdl_expiry <= NOW() + INTERVAL '30 days' OR medical_card_expiry <= NOW() + INTERVAL '30 days'))
        +
        (SELECT COUNT(*) FROM hub.trucks WHERE deleted_at IS NULL AND status <> 'retired'
          AND (registration_expiry <= NOW() + INTERVAL '30 days'
            OR inspection_due <= NOW() + INTERVAL '30 days'
            OR insurance_expiry <= NOW() + INTERVAL '30 days'))
      )::int AS expiring_30
  `)
  return row as DashboardStats
}

export interface ExpiringItem {
  entity: string
  name: string
  kind: string
  due: string
  href: string
}

export async function listExpiringItems(days = 60): Promise<ExpiringItem[]> {
  return query<ExpiringItem>(
    `
    SELECT * FROM (
      SELECT 'driver' AS entity, first_name || ' ' || last_name AS name, 'CDL' AS kind,
        cdl_expiry::text AS due, '/hub/drivers/' || id AS href
      FROM hub.drivers WHERE deleted_at IS NULL AND status = 'active' AND cdl_expiry IS NOT NULL
      UNION ALL
      SELECT 'driver', first_name || ' ' || last_name, 'Medical Card',
        medical_card_expiry::text, '/hub/drivers/' || id
      FROM hub.drivers WHERE deleted_at IS NULL AND status = 'active' AND medical_card_expiry IS NOT NULL
      UNION ALL
      SELECT 'truck', 'Truck ' || unit_number, 'Registration',
        registration_expiry::text, '/hub/fleet/trucks/' || id
      FROM hub.trucks WHERE deleted_at IS NULL AND status <> 'retired' AND registration_expiry IS NOT NULL
      UNION ALL
      SELECT 'truck', 'Truck ' || unit_number, 'Annual Inspection',
        inspection_due::text, '/hub/fleet/trucks/' || id
      FROM hub.trucks WHERE deleted_at IS NULL AND status <> 'retired' AND inspection_due IS NOT NULL
      UNION ALL
      SELECT 'truck', 'Truck ' || unit_number, 'Insurance',
        insurance_expiry::text, '/hub/fleet/trucks/' || id
      FROM hub.trucks WHERE deleted_at IS NULL AND status <> 'retired' AND insurance_expiry IS NOT NULL
    ) items
    WHERE due::date <= NOW() + ($1 || ' days')::interval
    ORDER BY due ASC
    LIMIT 20
    `,
    [days]
  )
}
