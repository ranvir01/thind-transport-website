"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { assertCarrierRefs } from "@/lib/hub/tenancy"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
}

export async function postCapacityAction(input: {
  truckId?: string
  equipment: "flatbed" | "reefer" | "dry_van"
  availableOn: string
  originCity: string
  originState: string
  destPreference?: string
  note?: string
}): Promise<Result> {
  try {
    // Capacity postings render on the PUBLIC /routes page, so this advertises
    // the fleet to brokers under the carrier's name — dispatch work, not
    // "any office role" (an accountant holds no loads:write).
    const user = await requirePermission("loads:write")
    if (!input.availableOn || !input.originCity.trim()) {
      return { ok: false, error: "When and where is the truck available?" }
    }
    await assertCarrierRefs(user.carrierId, { truck_id: input.truckId })
    await query(
      `INSERT INTO hub.capacity_postings (carrier_id, truck_id, equipment, available_on, origin_city, origin_state, dest_preference, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        user.carrierId, input.truckId || null, input.equipment, input.availableOn,
        input.originCity.trim(), input.originState.trim().toUpperCase().slice(0, 2),
        input.destPreference?.trim() || null, input.note?.trim() || null,
      ]
    )
    revalidatePath("/hub/capacity")
    revalidatePath("/routes")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not post")
  }
}

export async function removeCapacityAction(id: string): Promise<Result> {
  try {
    const user = await requirePermission("loads:write")
    await query(
      `UPDATE hub.capacity_postings SET active = FALSE WHERE carrier_id = $1 AND id = $2`,
      [user.carrierId, id]
    )
    revalidatePath("/hub/capacity")
    revalidatePath("/routes")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not remove")
  }
}
