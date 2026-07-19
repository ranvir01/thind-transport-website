/**
 * DVIRs — driver vehicle inspection reports (49 CFR 396.11 / 396.13).
 *
 * Post-trip: guided checklist, defects with photos, safe-to-operate, signature.
 * Any UNSAFE defect flips the truck to 'shop', opens a maintenance work order,
 * and dispatch legality refuses the truck until the office certifies the
 * repair AND the next driver's pre-trip reviews + signs off (396.13).
 */
import { hubDb, query, queryOne } from "./db"

/** The standard FMCSA part-393/396 inspection points, in plain words. */
export const DVIR_CHECKLIST = [
  { key: "brakes_service", label: "Service brakes" },
  { key: "brakes_parking", label: "Parking brake" },
  { key: "steering", label: "Steering" },
  { key: "lights", label: "Lights & reflectors" },
  { key: "tires", label: "Tires" },
  { key: "wheels", label: "Wheels & rims" },
  { key: "mirrors", label: "Mirrors" },
  { key: "horn", label: "Horn" },
  { key: "wipers", label: "Windshield wipers" },
  { key: "coupling", label: "Coupling / fifth wheel" },
  { key: "emergency", label: "Emergency equipment (triangles, extinguisher)" },
] as const

export interface DvirDefect {
  label: string
  note?: string
  photo_document_id?: string | null
}

export interface Dvir {
  id: string
  truck_id: string
  driver_id: string
  type: "pre" | "post"
  odometer: string | null
  checklist: { key: string; label: string; ok: boolean }[]
  defects: DvirDefect[]
  safe_to_operate: boolean
  signed_name: string
  prior_dvir_id: string | null
  repair_certified_by_name: string | null
  repair_certified_at: string | null
  created_at: string
  truck_unit?: string
  driver_name?: string
}

const DVIR_SELECT = `
  SELECT v.*, t.unit_number AS truck_unit, d.first_name || ' ' || d.last_name AS driver_name
  FROM hub.dvirs v
  JOIN hub.trucks t ON t.id = v.truck_id AND t.carrier_id = v.carrier_id
  JOIN hub.drivers d ON d.id = v.driver_id AND d.carrier_id = v.carrier_id`

export async function listDvirsForTruck(carrierId: string, truckId: string, limit = 10): Promise<Dvir[]> {
  return query<Dvir>(
    `${DVIR_SELECT} WHERE v.carrier_id = $1 AND v.truck_id = $2 ORDER BY v.created_at DESC LIMIT $3`,
    [carrierId, truckId, limit]
  )
}

/**
 * What the driver owes on this truck right now:
 * - a defective post-trip awaiting repair certification → truck is grounded
 * - a certified post-trip awaiting the pre-trip review sign-off (396.13)
 * - otherwise: a fresh post-trip at end of day
 */
export async function truckDvirState(
  carrierId: string,
  truckId: string
): Promise<{
  state: "clear" | "awaiting_repair" | "awaiting_review"
  openDvir: Dvir | null
}> {
  const lastDefective = await queryOne<Dvir>(
    `${DVIR_SELECT}
     WHERE v.carrier_id = $1 AND v.truck_id = $2 AND v.type = 'post'
       AND jsonb_array_length(v.defects) > 0
       AND NOT EXISTS (
         SELECT 1 FROM hub.dvirs r
         WHERE r.prior_dvir_id = v.id AND r.carrier_id = v.carrier_id AND r.truck_id = v.truck_id
       )
     ORDER BY v.created_at DESC LIMIT 1`,
    [carrierId, truckId]
  )
  if (!lastDefective) return { state: "clear", openDvir: null }
  if (!lastDefective.repair_certified_at) return { state: "awaiting_repair", openDvir: lastDefective }
  return { state: "awaiting_review", openDvir: lastDefective }
}

export async function submitDvir(
  carrierId: string,
  input: {
    truckId: string
    driverId: string
    type: "pre" | "post"
    odometer?: number | null
    checklist: { key: string; label: string; ok: boolean }[]
    defects: DvirDefect[]
    safeToOperate: boolean
    signature: string
    signedName: string
    priorDvirId?: string | null
  }
): Promise<{ id: string; grounded: boolean }> {
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    // prior_dvir_id is a client-supplied cross-table ref: it must be this
    // carrier's DVIR on this same truck, or the 396.13 review chain can be
    // forged — a foreign reference suppresses truckDvirState's open defect,
    // and a certified DVIR from another truck would release this one unrepaired.
    let prior: { repair_certified_at: string | null } | null = null
    if (input.priorDvirId) {
      const priorLookup = await client.query(
        `SELECT repair_certified_at FROM hub.dvirs WHERE id = $1 AND carrier_id = $2 AND truck_id = $3`,
        [input.priorDvirId, carrierId, input.truckId]
      )
      prior = priorLookup.rows[0] ?? null
      if (!prior) throw new Error("Prior inspection not found on this truck")
    }
    const { rows } = await client.query(
      `INSERT INTO hub.dvirs (carrier_id, truck_id, driver_id, type, odometer, checklist, defects,
         safe_to_operate, signature, signed_name, prior_dvir_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        carrierId, input.truckId, input.driverId, input.type, input.odometer ?? null,
        JSON.stringify(input.checklist), JSON.stringify(input.defects),
        input.safeToOperate, input.signature, input.signedName, input.priorDvirId ?? null,
      ]
    )
    const dvirId = rows[0].id as string
    let grounded = false

    if (input.type === "post" && input.defects.length > 0 && !input.safeToOperate) {
      // Unsafe defect: ground the truck and open a work order (396.11(a)(3)).
      await client.query(
        `UPDATE hub.trucks SET status = 'shop', updated_at = NOW() WHERE carrier_id = $1 AND id = $2`,
        [carrierId, input.truckId]
      )
      const { rows: workOrder } = await client.query(
        `INSERT INTO hub.maintenance_records (carrier_id, truck_id, done_on, odometer, vendor, cost_cents, notes)
         VALUES ($1, $2, CURRENT_DATE, $3, 'TBD — open work order', 0, $4) RETURNING id`,
        [
          carrierId, input.truckId, input.odometer ?? null,
          `DVIR defects: ${input.defects.map((d) => d.label).join("; ")} (awaiting repair certification)`,
        ]
      )
      await client.query(`UPDATE hub.dvirs SET repair_work_order_id = $1 WHERE id = $2`, [
        workOrder[0].id, dvirId,
      ])
      grounded = true
    }

    if (input.type === "pre" && prior?.repair_certified_at) {
      // 396.13(c): the reviewing driver's signature releases a certified truck.
      await client.query(
        `UPDATE hub.trucks SET status = 'active', updated_at = NOW()
         WHERE carrier_id = $1 AND id = $2 AND status = 'shop'`,
        [carrierId, input.truckId]
      )
    }

    await client.query("COMMIT")
    return { id: dvirId, grounded }
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

/** Office/mechanic certifies the repairs on a defective post-trip (396.13(b)). */
export async function certifyRepair(
  carrierId: string,
  dvirId: string,
  input: { vendor: string; costCents: number; notes: string },
  certifier: { id: string; name: string }
): Promise<boolean> {
  const dvir = await queryOne<{ id: string; truck_id: string; repair_work_order_id: string | null }>(
    `SELECT id, truck_id, repair_work_order_id FROM hub.dvirs
     WHERE carrier_id = $1 AND id = $2 AND repair_certified_at IS NULL`,
    [carrierId, dvirId]
  )
  if (!dvir) return false
  if (dvir.repair_work_order_id) {
    await query(
      `UPDATE hub.maintenance_records SET vendor = $3, cost_cents = $4, notes = $5, done_on = CURRENT_DATE
       WHERE carrier_id = $1 AND id = $2`,
      [carrierId, dvir.repair_work_order_id, input.vendor, input.costCents,
       `${input.notes} (repair certified by ${certifier.name})`]
    )
  }
  await query(
    `UPDATE hub.dvirs SET repair_certified_by = $3, repair_certified_by_name = $4, repair_certified_at = NOW()
     WHERE carrier_id = $1 AND id = $2`,
    [carrierId, dvirId, certifier.id, certifier.name]
  )
  return true
}
