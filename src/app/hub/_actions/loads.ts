"use server"

import { revalidatePath } from "next/cache"
import { requireOfficeUser } from "@/lib/hub/session"
import { loadSchema, documentUploadSchema } from "@/lib/hub/schemas"
import {
  createLoad, updateLoad, changeLoadStatus, replaceStops, setStopTimestamp, getLoad,
} from "@/lib/hub/loads"
import { saveDocument, deleteDocument } from "@/lib/hub/documents"
import { logAudit } from "@/lib/hub/audit"
import { geocodeCityState } from "@/lib/hub/geocode"
import { NEXT_STATUS, type LoadStatus, LOAD_STATUSES } from "@/lib/hub/types"
import type { ActionResult } from "./fleet"

function firstError(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  const issue = error.issues[0]
  return issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid input"
}

function revalidateLoadViews(id?: string) {
  revalidatePath("/hub")
  revalidatePath("/hub/dispatch")
  revalidatePath("/hub/loads")
  if (id) revalidatePath(`/hub/loads/${id}`)
}

async function geocodeStops<T extends { city: string; state: string; lat?: number | null; lng?: number | null }>(
  stops: T[]
): Promise<T[]> {
  // Best-effort, sequential to respect Nominatim rate limits; failures leave lat/lng null.
  const result: T[] = []
  for (const stop of stops) {
    if (stop.lat != null && stop.lng != null) {
      result.push(stop)
      continue
    }
    const coords = await geocodeCityState(stop.city, stop.state)
    result.push({ ...stop, lat: coords?.lat ?? null, lng: coords?.lng ?? null })
  }
  return result
}

export async function createLoadAction(values: Record<string, unknown>): Promise<ActionResult> {
  const user = await requireOfficeUser()
  const parsed = loadSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const stops = await geocodeStops(parsed.data.stops)
    const load = await createLoad(
      { ...parsed.data, stops, weight_lbs: parsed.data.weight_lbs ?? null },
      { id: user.id, name: user.name }
    )
    await logAudit({
      actorId: user.id, actorName: user.name,
      entityType: "load", entityId: load.id,
      action: "create", newValue: { reference: load.reference, linehaul: parsed.data.linehaul },
    })
    revalidateLoadViews(load.id)
    return { ok: true, id: load.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create load" }
  }
}

export async function updateLoadAction(
  id: string,
  values: Record<string, unknown>
): Promise<ActionResult> {
  const user = await requireOfficeUser()
  const parsed = loadSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const before = await getLoad(id)
    if (!before) return { ok: false, error: "Load not found" }
    const { stops, ...rest } = parsed.data
    const load = await updateLoad(id, { ...rest, weight_lbs: rest.weight_lbs ?? null })
    if (!load) return { ok: false, error: "Load not found" }
    const geocoded = await geocodeStops(stops)
    await replaceStops(id, geocoded)
    await logAudit({
      actorId: user.id, actorName: user.name,
      entityType: "load", entityId: id, action: "update",
      oldValue: { linehaul: before.linehaul, fuel_surcharge: before.fuel_surcharge },
      newValue: { linehaul: rest.linehaul, fuel_surcharge: rest.fuel_surcharge },
    })
    revalidateLoadViews(id)
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update load" }
  }
}

export async function advanceLoadStatusAction(id: string): Promise<ActionResult> {
  const user = await requireOfficeUser()
  try {
    const load = await getLoad(id)
    if (!load) return { ok: false, error: "Load not found" }
    const next = NEXT_STATUS[load.status]
    if (!next) return { ok: false, error: `No next status after ${load.status}` }
    await changeLoadStatus(id, next, { id: user.id, name: user.name })
    revalidateLoadViews(id)
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to advance status" }
  }
}

export async function setLoadStatusAction(id: string, status: string): Promise<ActionResult> {
  const user = await requireOfficeUser()
  if (!LOAD_STATUSES.includes(status as LoadStatus)) {
    return { ok: false, error: "Unknown status" }
  }
  try {
    const updated = await changeLoadStatus(id, status as LoadStatus, { id: user.id, name: user.name })
    if (!updated) return { ok: false, error: "Load not found" }
    revalidateLoadViews(id)
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to set status" }
  }
}

export async function stopTimestampAction(
  stopId: string,
  loadId: string,
  field: "arrived_at" | "departed_at"
): Promise<ActionResult> {
  await requireOfficeUser()
  try {
    await setStopTimestamp(stopId, field, new Date().toISOString())
    revalidateLoadViews(loadId)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to record time" }
  }
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

export async function uploadDocumentAction(formData: FormData): Promise<ActionResult> {
  const user = await requireOfficeUser()
  const parsed = documentUploadSchema.safeParse({
    entity_type: formData.get("entity_type"),
    entity_id: formData.get("entity_id"),
    kind: formData.get("kind"),
    expiry: formData.get("expiry") || "",
  })
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pick a file to upload" }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is over the 15MB limit" }

  try {
    const doc = await saveDocument({
      entityType: parsed.data.entity_type,
      entityId: parsed.data.entity_id,
      kind: parsed.data.kind,
      file,
      expiry: parsed.data.expiry ?? null,
      uploadedBy: user.id,
    })
    if (parsed.data.entity_type === "load") revalidateLoadViews(parsed.data.entity_id)
    else revalidatePath(`/hub/${parsed.data.entity_type}s/${parsed.data.entity_id}`)
    return { ok: true, id: doc.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed" }
  }
}

export async function deleteDocumentAction(
  id: string,
  entityType: string,
  entityId: string
): Promise<ActionResult> {
  const user = await requireOfficeUser()
  try {
    await deleteDocument(id)
    await logAudit({
      actorId: user.id, actorName: user.name,
      entityType: "document", entityId: id, action: "delete",
      oldValue: { entityType, entityId },
    })
    if (entityType === "load") revalidateLoadViews(entityId)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed" }
  }
}
