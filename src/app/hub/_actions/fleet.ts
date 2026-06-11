"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { truckSchema, trailerSchema } from "@/lib/hub/schemas"
import { createTruck, updateTruck, createTrailer, updateTrailer } from "@/lib/hub/fleet"
import { logAudit } from "@/lib/hub/audit"
import { decodeVin } from "@/lib/hub/vin"

export interface ActionResult {
  ok: boolean
  error?: string
  id?: string
}

function firstError(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  const issue = error.issues[0]
  return issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid input"
}

export async function saveTruckAction(
  id: string | null,
  values: Record<string, unknown>
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("fleet:write")
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Forbidden" }
  }
  const parsed = truckSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const input = {
      ...parsed.data,
      year: parsed.data.year ?? null,
      tank_capacity_gallons: parsed.data.tank_capacity_gallons ?? null,
    }
    const truck = id
      ? await updateTruck(user.carrierId, id, input)
      : await createTruck(user.carrierId, input)
    if (!truck) return { ok: false, error: "Truck not found" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "truck", entityId: truck.id,
      action: id ? "update" : "create", newValue: parsed.data,
    })
    revalidatePath("/hub/fleet")
    return { ok: true, id: truck.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save truck"
    return { ok: false, error: message.includes("unique") || message.includes("duplicate") ? "Unit number already exists" : message }
  }
}

export async function saveTrailerAction(
  id: string | null,
  values: Record<string, unknown>
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("fleet:write")
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Forbidden" }
  }
  const parsed = trailerSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const input = { ...parsed.data, year: parsed.data.year ?? null }
    const trailer = id
      ? await updateTrailer(user.carrierId, id, input)
      : await createTrailer(user.carrierId, input)
    if (!trailer) return { ok: false, error: "Trailer not found" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "trailer", entityId: trailer.id,
      action: id ? "update" : "create", newValue: parsed.data,
    })
    revalidatePath("/hub/fleet")
    return { ok: true, id: trailer.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save trailer"
    return { ok: false, error: message.includes("unique") || message.includes("duplicate") ? "Unit number already exists" : message }
  }
}

export async function decodeVinAction(vin: string) {
  await requirePermission("fleet:write")
  if (!vin || vin.trim().length < 11) return null
  return decodeVin(vin.trim())
}
