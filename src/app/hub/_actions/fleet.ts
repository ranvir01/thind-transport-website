"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireOfficeUser } from "@/lib/hub/session"
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
  const user = await requireOfficeUser()
  const parsed = truckSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const input = { ...parsed.data, year: parsed.data.year ?? null }
    const truck = id ? await updateTruck(id, input) : await createTruck(input)
    if (!truck) return { ok: false, error: "Truck not found" }
    await logAudit({
      actorId: user.id, actorName: user.name,
      entityType: "truck", entityId: truck.id,
      action: id ? "update" : "create", newValue: parsed.data,
    })
    revalidatePath("/hub/fleet")
    return { ok: true, id: truck.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save truck"
    return { ok: false, error: message.includes("unique") ? "Unit number already exists" : message }
  }
}

export async function saveTrailerAction(
  id: string | null,
  values: Record<string, unknown>
): Promise<ActionResult> {
  const user = await requireOfficeUser()
  const parsed = trailerSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const input = { ...parsed.data, year: parsed.data.year ?? null }
    const trailer = id ? await updateTrailer(id, input) : await createTrailer(input)
    if (!trailer) return { ok: false, error: "Trailer not found" }
    await logAudit({
      actorId: user.id, actorName: user.name,
      entityType: "trailer", entityId: trailer.id,
      action: id ? "update" : "create", newValue: parsed.data,
    })
    revalidatePath("/hub/fleet")
    return { ok: true, id: trailer.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save trailer"
    return { ok: false, error: message.includes("unique") ? "Unit number already exists" : message }
  }
}

export async function decodeVinAction(vin: string) {
  await requireOfficeUser()
  if (!vin || vin.trim().length < 11) return null
  return decodeVin(vin.trim())
}

export async function redirectAfterSave(path: string) {
  redirect(path)
}
