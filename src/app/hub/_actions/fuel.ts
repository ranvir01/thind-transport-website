"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { setFuelUse } from "@/lib/hub/fuel"
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
  await setFuelUse(user.carrierId, transactionId, fuelUse)
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
