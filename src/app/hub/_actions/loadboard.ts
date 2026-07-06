"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { patchLoadBoardField, type LoadBoardField } from "@/lib/hub/loadboard"
import { logAudit } from "@/lib/hub/audit"
import type { ActionResult } from "./fleet"

const LOADBOARD_FIELDS: LoadBoardField[] = [
  "customer_reference",
  "status",
  "origin_city",
  "origin_state",
  "dest_city",
  "dest_state",
  "driver_id",
  "truck_id",
  "pickup_date",
  "linehaul",
  "fuel_surcharge",
  "loaded_miles",
  "notes",
]

function revalidateLoadBoard(id?: string) {
  revalidatePath("/hub/loadboard")
  revalidatePath("/hub/loads")
  revalidatePath("/hub/dispatch")
  revalidatePath("/hub")
  if (id) revalidatePath(`/hub/loads/${id}`)
}

export async function patchLoadBoardFieldAction(
  loadId: string,
  field: string,
  value: string
): Promise<ActionResult> {
  if (!LOADBOARD_FIELDS.includes(field as LoadBoardField)) {
    return { ok: false, error: "Invalid field" }
  }

  let user
  try {
    user = await requirePermission(field === "status" ? "loads:status" : "loads:write")
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Forbidden" }
  }

  try {
    const load = await patchLoadBoardField(
      user.carrierId,
      loadId,
      field as LoadBoardField,
      value,
      { id: user.id, name: user.name }
    )
    if (!load) return { ok: false, error: "Load not found" }

    await logAudit({
      carrierId: user.carrierId,
      actorId: user.id,
      actorName: user.name,
      entityType: "load",
      entityId: loadId,
      action: "update",
      newValue: { field, value },
    })

    revalidateLoadBoard(loadId)
    return { ok: true, id: load.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" }
  }
}
