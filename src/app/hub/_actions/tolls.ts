"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { assignTollToTruck } from "@/lib/hub/tolls"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"

/** Reconcile an imported toll transaction to the truck that incurred it (or clear with truckId = null). */
export async function assignTollTruckAction(
  transactionId: string,
  truckId: string | null
): Promise<{ ok: boolean; error?: string }> {
  let user
  try {
    user = await requirePermission("fuel:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  const touched = await assignTollToTruck(user.carrierId, transactionId, truckId)
  if (touched === 0) {
    return { ok: false, error: "Could not match that toll to the truck" }
  }
  await logAudit({
    carrierId: user.carrierId,
    actorId: user.id,
    actorName: user.name,
    entityType: "toll_transaction",
    entityId: transactionId,
    action: truckId ? "assign_toll_truck" : "unassign_toll_truck",
    newValue: { truckId },
  })
  revalidatePath("/hub/fuel/tolls")
  return { ok: true }
}
