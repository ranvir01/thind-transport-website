"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { getLoad } from "@/lib/hub/loads"
import { suggestMiles } from "@/lib/hub/routing"
import { milesSourceLabel, type MilesSource } from "@/lib/hub/routing-core"
import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"

/**
 * Compute suggested drive miles for a load's lane (read-only — does not save).
 * Returns the number plus where it came from so the UI can show provenance.
 */
export async function suggestLoadMilesAction(
  loadId: string
): Promise<{ ok: boolean; miles?: number; source?: MilesSource; sourceLabel?: string; error?: string }> {
  let user
  try {
    user = await requirePermission("loads:read")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  const load = await getLoad(user.carrierId, loadId)
  if (!load) return { ok: false, error: "Load not found" }

  const result = await suggestMiles(
    { city: load.origin_city, state: load.origin_state },
    { city: load.dest_city, state: load.dest_state }
  )
  if (!result) {
    return { ok: false, error: "Couldn't route this lane — add pickup/delivery cities, or type miles manually." }
  }
  return { ok: true, miles: result.miles, source: result.source, sourceLabel: milesSourceLabel(result.source) }
}

/** Save suggested (or edited) loaded miles onto the load. Audited like a rate change. */
export async function applyLoadMilesAction(
  loadId: string,
  miles: number
): Promise<{ ok: boolean; error?: string }> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  if (!Number.isFinite(miles) || miles <= 0 || miles > 100000) {
    return { ok: false, error: "Enter a mileage between 1 and 100,000" }
  }
  const rounded = Math.round(miles)
  const rows = await query(
    `UPDATE hub.loads SET loaded_miles = $3, updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING id`,
    [user.carrierId, loadId, rounded]
  )
  if (rows.length === 0) return { ok: false, error: "Load not found" }
  await logAudit({
    carrierId: user.carrierId,
    actorId: user.id,
    actorName: user.name,
    entityType: "load",
    entityId: loadId,
    action: "set_loaded_miles",
    newValue: { miles: rounded },
  })
  revalidatePath(`/hub/loads/${loadId}`)
  revalidatePath("/hub/loads")
  revalidatePath("/hub/loadboard")
  return { ok: true }
}
