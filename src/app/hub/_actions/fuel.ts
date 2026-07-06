"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { setFuelUse, assignFuelToLoad } from "@/lib/hub/fuel"
import { logAudit } from "@/lib/hub/audit"
import { FUEL_USES, type FuelUse } from "@/lib/hub/types"

/**
 * Manual fuel-use reclassification (tractor / reefer / other). This changes
 * IFTA tax-paid gallons and MPG, so it is audited like money.
 */
export async function reclassifyFuelUse(
  transactionId: string,
  fuelUse: FuelUse
): Promise<{ ok: boolean; error?: string }> {
  let user
  try {
    user = await requirePermission("fuel:write")
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Forbidden" }
  }
  if (!FUEL_USES.includes(fuelUse)) return { ok: false, error: "Bad fuel use" }
  const changed = await setFuelUse(user.carrierId, transactionId, fuelUse)
  if (!changed) return { ok: false, error: "Receipt not found" }
  await logAudit({
    carrierId: user.carrierId,
    actorId: user.id,
    actorName: user.name,
    entityType: "fuel_transaction",
    entityId: transactionId,
    action: "reclassify_fuel_use",
    newValue: { fuelUse },
  })
  revalidatePath("/hub/fuel")
  return { ok: true }
}

/** Reconcile a fuel receipt to a load (or clear with loadId = null). */
export async function assignFuelLoadAction(
  transactionId: string,
  loadId: string | null
): Promise<{ ok: boolean; error?: string }> {
  let user
  try {
    user = await requirePermission("fuel:write")
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Forbidden" }
  }
  const touched = await assignFuelToLoad(user.carrierId, transactionId, loadId)
  if (touched === 0) {
    return { ok: false, error: "Could not match that receipt to the load" }
  }
  await logAudit({
    carrierId: user.carrierId,
    actorId: user.id,
    actorName: user.name,
    entityType: "fuel_transaction",
    entityId: transactionId,
    action: loadId ? "assign_fuel_load" : "unassign_fuel_load",
    newValue: { loadId },
  })
  revalidatePath("/hub/fuel")
  if (loadId) revalidatePath(`/hub/loads/${loadId}`)
  return { ok: true }
}
