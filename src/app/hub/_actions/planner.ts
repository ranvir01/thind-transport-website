"use server"

/**
 * Planner drag actions (E1): assign/reassign a load to a truck and/or shift
 * its schedule by whole days — with the same legality checks dispatch uses.
 */
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { addLoadEvent } from "@/lib/hub/loads"
import { dispatchLegality } from "@/lib/hub/drivers"
import { formatHubDateShort } from "@/lib/hub/format-dates"
import { driverTimeOffConflict } from "@/lib/hub/timeoff"
import { query, queryOne } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"
import type { Driver } from "@/lib/hub/types"

interface Result {
  ok: boolean
  error?: string
  warning?: string
}

const RESCHEDULABLE = ["quoted", "booked", "dispatched"]
const REASSIGNABLE = ["quoted", "booked", "dispatched"]

export async function plannerMoveLoadAction(
  loadId: string,
  target: { truckId?: string | null; dayDelta?: number }
): Promise<Result> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }

  const load = await queryOne<{
    id: string; reference: string; status: string; truck_id: string | null; driver_id: string | null
  }>(
    `SELECT id, reference, status, truck_id, driver_id FROM hub.loads
     WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [user.carrierId, loadId]
  )
  if (!load) return { ok: false, error: "Load not found" }

  const dayDelta = target.dayDelta ?? 0
  const changingTruck = target.truckId !== undefined && target.truckId !== load.truck_id

  if (dayDelta !== 0 && !RESCHEDULABLE.includes(load.status)) {
    return { ok: false, error: `${load.reference} is ${load.status.replace("_", " ")} — its schedule can't shift anymore` }
  }
  if (changingTruck && !REASSIGNABLE.includes(load.status)) {
    return { ok: false, error: `${load.reference} is ${load.status.replace("_", " ")} — too late to swap trucks from the planner` }
  }

  // Window after the (possible) shift, for conflict checks. load_id alone is already
  // tenant-safe here (loadId was just proven to belong to user.carrierId above), but every
  // hub.stops statement carries its own carrier_id per the cross-tenant harness — no query
  // should depend on a sibling query's validation to stay scoped.
  const window = await queryOne<{ starts: string; ends: string }>(
    `SELECT
       (MIN(COALESCE(appt_start, NOW())) + ($3 || ' days')::interval)::date::text AS starts,
       (MAX(COALESCE(appt_end, appt_start, NOW() + INTERVAL '1 day')) + ($3 || ' days')::interval)::date::text AS ends
     FROM hub.stops WHERE load_id = $1 AND carrier_id = $2`,
    [loadId, user.carrierId, dayDelta]
  )

  let effectiveDriverId = load.driver_id
  let assignedDriverName: string | null = null
  let warning: string | undefined

  if (changingTruck && target.truckId) {
    const truck = await queryOne<{
      id: string; unit_number: string; status: string; assigned_driver_id: string | null
    }>(
      `SELECT id, unit_number, status, assigned_driver_id FROM hub.trucks
       WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [user.carrierId, target.truckId]
    )
    if (!truck) return { ok: false, error: "Truck not found" }
    if (truck.status === "shop") {
      return { ok: false, error: `Truck #${truck.unit_number} is in the shop — it can't take a load` }
    }

    // No driver on the load? The truck's seated driver comes with it.
    if (!effectiveDriverId && truck.assigned_driver_id) {
      effectiveDriverId = truck.assigned_driver_id
    }

    if (effectiveDriverId) {
      const driver = await queryOne<Driver>(
        `SELECT * FROM hub.drivers WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [user.carrierId, effectiveDriverId]
      )
      const legality = dispatchLegality(driver, truck)
      if (!legality.legal) {
        return { ok: false, error: legality.stops.join("; ") }
      }
      if (legality.warnings.length > 0) warning = legality.warnings.join("; ")
      assignedDriverName = driver ? `${driver.first_name} ${driver.last_name}` : null
    }
  }

  // Approved home time is a hard wall (E5 ↔ E1).
  if (effectiveDriverId && window) {
    const conflict = await driverTimeOffConflict(
      user.carrierId, effectiveDriverId, window.starts, window.ends
    )
    if (conflict) {
      return {
        ok: false,
        error: `${conflict.driver_name ?? "The driver"} has approved time off ${formatHubDateShort(conflict.start_date)} – ${formatHubDateShort(conflict.end_date)} — pick another truck or another week`,
      }
    }
  }

  // HOS estimate (Phase 6): warn when the run likely exceeds the remaining
  // drive clock. Display-only — the ELD is authoritative.
  if (effectiveDriverId) {
    const miles = await queryOne<{ loaded_miles: number | null }>(
      `SELECT loaded_miles FROM hub.loads WHERE carrier_id = $1 AND id = $2`,
      [user.carrierId, loadId]
    )
    if (miles?.loaded_miles) {
      const { hosLegalityWarning } = await import("@/lib/hub/telematics")
      const hosWarning = await hosLegalityWarning(
        user.carrierId, effectiveDriverId, miles.loaded_miles / 47
      )
      if (hosWarning) warning = [warning, hosWarning].filter(Boolean).join("; ")
    }
  }

  // Double-booking is a warning, not a wall — dispatchers stack legally all the time.
  if (window) {
    const overlapping = await queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count FROM hub.loads l
       JOIN LATERAL (SELECT MIN(COALESCE(appt_start, l.created_at))::date AS s,
                            MAX(COALESCE(appt_end, appt_start, l.created_at + INTERVAL '1 day'))::date AS e
                     FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id) w ON TRUE
       WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.id <> $2
         AND l.truck_id = $3 AND l.status IN ('booked','dispatched','at_pickup','in_transit')
         AND w.s <= $5::date AND w.e >= $4::date`,
      [user.carrierId, loadId, target.truckId ?? load.truck_id, window.starts, window.ends]
    )
    if (Number(overlapping?.count ?? 0) > 0) {
      warning = [warning, `heads up: this truck already has ${overlapping!.count} load(s) in that window`]
        .filter(Boolean)
        .join("; ")
    }
  }

  // Apply.
  if (dayDelta !== 0) {
    await query(
      `UPDATE hub.stops SET
         appt_start = appt_start + ($3 || ' days')::interval,
         appt_end = appt_end + ($3 || ' days')::interval,
         updated_at = NOW()
       WHERE load_id = $2 AND carrier_id = $1`,
      [user.carrierId, loadId, dayDelta]
    )
  }
  if (changingTruck) {
    await query(
      `UPDATE hub.loads SET truck_id = $3,
         driver_id = COALESCE(driver_id, $4),
         updated_at = NOW()
       WHERE carrier_id = $1 AND id = $2`,
      [user.carrierId, loadId, target.truckId, effectiveDriverId]
    )
  }

  await addLoadEvent(user.carrierId, loadId, "note", {
    planner: true,
    dayDelta,
    truckChanged: changingTruck,
    assignedDriver: assignedDriverName,
  }, { id: user.id, name: user.name })
  await logAudit({
    carrierId: user.carrierId, actorId: user.id, actorName: user.name,
    entityType: "load", entityId: loadId, action: "planner_move",
    newValue: { truckId: target.truckId, dayDelta },
  })

  revalidatePath("/hub/planner")
  revalidatePath("/hub/dispatch")
  revalidatePath(`/hub/loads/${loadId}`)
  return { ok: true, warning }
}
