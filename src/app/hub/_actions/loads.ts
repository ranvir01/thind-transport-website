"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { loadSchema, documentUploadSchema } from "@/lib/hub/schemas"
import {
  createLoad, updateLoad, changeLoadStatus, replaceStops, setStopTimestamp, getLoad,
  addLoadEvent,
} from "@/lib/hub/loads"
import { applyDetentionAccrual } from "@/lib/hub/detention"
import { rebookLoad } from "@/lib/hub/recurring"
import { getDriver, dispatchLegality } from "@/lib/hub/drivers"
import { getTruck } from "@/lib/hub/fleet"
import { saveDocument, deleteDocument } from "@/lib/hub/documents"
import { assertCarrierRefs, type CarrierRefField } from "@/lib/hub/tenancy"
import { createShareLink, revokeShareLink, renewShareLink } from "@/lib/hub/sharelinks"
import { logAudit } from "@/lib/hub/audit"
import { geocodeCityState } from "@/lib/hub/geocode"
import { NEXT_STATUS, STATUS_LABELS, canCancelLoad, dollarsToCents } from "@/lib/hub/types"
import { actionError } from "@/lib/hub/action-error"
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

function toLoadInput(parsed: ReturnType<typeof loadSchema.parse>) {
  return {
    customer_id: parsed.customer_id,
    customer_reference: parsed.customer_reference,
    equipment: parsed.equipment,
    commodity: parsed.commodity,
    weight_lbs: parsed.weight_lbs ?? null,
    linehaul_cents: dollarsToCents(parsed.linehaul),
    fuel_surcharge_cents: dollarsToCents(parsed.fuel_surcharge),
    accessorials: parsed.accessorials.map((a) => ({ label: a.label, amount_cents: dollarsToCents(a.amount) })),
    loaded_miles: parsed.loaded_miles ?? null,
    deadhead_miles: parsed.deadhead_miles ?? null,
    truck_id: parsed.truck_id,
    trailer_id: parsed.trailer_id,
    driver_id: parsed.driver_id,
    factored: parsed.factored,
    notes: parsed.notes,
  }
}

export async function createLoadAction(values: Record<string, unknown>): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  const parsed = loadSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const stops = await geocodeStops(parsed.data.stops)
    const source =
      values.source === "quote" ? "quote" : values.source === "dat" ? "dat" : "direct"
    const load = await createLoad(
      user.carrierId,
      { ...toLoadInput(parsed.data), source, stops },
      { id: user.id, name: user.name }
    )
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "load", entityId: load.id,
      action: "create", newValue: { reference: load.reference, linehaul_cents: load.linehaul_cents },
    })
    revalidateLoadViews(load.id)
    return { ok: true, id: load.id }
  } catch (err) {
    return actionError(err, "Failed to create load")
  }
}

/**
 * Rebook a recurring lane in one click: copies the lane, rate, equipment and
 * assignment onto a fresh booked load. Per-shipment facts stay behind —
 * customer ref, PU#/PO#, appointment windows, stop timestamps, documents, and
 * earned detention accessorials all belong to the trip they happened on.
 */
export async function duplicateLoadAction(id: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    // Copy/strip matrix lives in rebookLoad, shared with the recurring-rebook
    // cron so the manual and scheduled paths can never drift.
    const result = await rebookLoad(user.carrierId, id, { id: user.id, name: user.name })
    if (!result.ok) return result
    revalidateLoadViews(result.load.id)
    return { ok: true, id: result.load.id }
  } catch (err) {
    return actionError(err, "Failed to duplicate load")
  }
}

export async function updateLoadAction(
  id: string,
  values: Record<string, unknown>
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  const parsed = loadSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const before = await getLoad(user.carrierId, id)
    if (!before) return { ok: false, error: "Load not found" }
    const input = toLoadInput(parsed.data)
    const load = await updateLoad(user.carrierId, id, input)
    if (!load) return { ok: false, error: "Load not found" }
    const geocoded = await geocodeStops(parsed.data.stops)
    await replaceStops(user.carrierId, id, geocoded)
    // Rate changes are money mutations — always audited with old/new values.
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "load", entityId: id, action: "update",
      oldValue: { linehaul_cents: before.linehaul_cents, fuel_surcharge_cents: before.fuel_surcharge_cents },
      newValue: { linehaul_cents: input.linehaul_cents, fuel_surcharge_cents: input.fuel_surcharge_cents },
    })
    revalidateLoadViews(id)
    return { ok: true, id }
  } catch (err) {
    return actionError(err, "Failed to update load")
  }
}

export async function advanceLoadStatusAction(id: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:status")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const load = await getLoad(user.carrierId, id)
    if (!load) return { ok: false, error: "Load not found" }
    const next = NEXT_STATUS[load.status]
    if (!next) return { ok: false, error: `No next status after ${load.status}` }
    // Legality gate: the board shows hard stops (expired CDL/medical, truck in shop)
    // but dispatch must be refused server-side, same as the planner assignment path.
    if (next === "dispatched") {
      const [driver, truck] = await Promise.all([
        load.driver_id ? getDriver(user.carrierId, load.driver_id) : null,
        load.truck_id ? getTruck(user.carrierId, load.truck_id) : null,
      ])
      const legality = dispatchLegality(driver, truck)
      if (!legality.legal) {
        return { ok: false, error: legality.stops.join("; ") }
      }
    }
    // Document gate: POD before pod_received (no BOL gate — drivers mark
    // delivered from the road before paperwork is scanned).
    const docs = load.doc_kinds ?? []
    if (next === "pod_received" && !docs.includes("pod")) {
      return { ok: false, error: "Upload the POD before marking POD received" }
    }
    await changeLoadStatus(user.carrierId, id, next, { id: user.id, name: user.name })
    revalidateLoadViews(id)
    return { ok: true, id }
  } catch (err) {
    return actionError(err, "Failed to advance status")
  }
}

/**
 * Cancel-only: forward moves must go through advanceLoadStatusAction (legality
 * + document gates) and money statuses are set by the invoice/settlement flow,
 * so any other target is refused regardless of what the caller sends.
 */
export async function setLoadStatusAction(id: string, status: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:status")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  if (status !== "cancelled") {
    return { ok: false, error: "Only cancellation is allowed here — use Advance for forward moves" }
  }
  try {
    const load = await getLoad(user.carrierId, id)
    if (!load) return { ok: false, error: "Load not found" }
    if (!canCancelLoad(load.status)) {
      return { ok: false, error: `Cannot cancel a load that is ${STATUS_LABELS[load.status].toLowerCase()}` }
    }
    const updated = await changeLoadStatus(user.carrierId, id, "cancelled", { id: user.id, name: user.name })
    if (!updated) return { ok: false, error: "Load not found" }
    revalidateLoadViews(id)
    return { ok: true, id }
  } catch (err) {
    return actionError(err, "Failed to set status")
  }
}

export async function stopTimestampAction(
  stopId: string,
  loadId: string,
  field: "arrived_at" | "departed_at"
): Promise<ActionResult & { detentionAppliedCents?: number }> {
  let user
  try {
    user = await requirePermission("loads:status")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const stop = await setStopTimestamp(user.carrierId, stopId, loadId, field, new Date().toISOString())
    if (stop) {
      await addLoadEvent(user.carrierId, loadId, "geo", {
        stop_id: stopId, field, city: stop.city, state: stop.state,
      }, { id: user.id, name: user.name })
    }
    let detentionAppliedCents: number | undefined
    if (field === "departed_at") {
      // Best-effort: a closed stop always records, even if detention math fails.
      try {
        const accrual = await applyDetentionAccrual(user.carrierId, loadId, { id: user.id, name: user.name })
        if (accrual.ok && accrual.changed) detentionAppliedCents = accrual.amountCents
      } catch (err) {
        console.error("applyDetentionAccrual failed:", err)
      }
    }
    revalidateLoadViews(loadId)
    return { ok: true, detentionAppliedCents }
  } catch (err) {
    return actionError(err, "Failed to record time")
  }
}

/**
 * Manual detention recompute: marking a stop departed already auto-applies
 * detention (see stopTimestampAction), so this is the fallback for loads
 * that closed before that existed, or whose detention settings changed
 * after the fact.
 */
export async function addDetentionAction(loadId: string): Promise<ActionResult & { amountCents?: number }> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const result = await applyDetentionAccrual(user.carrierId, loadId, { id: user.id, name: user.name })
    if (!result.ok) return { ok: false, error: result.error ?? "Could not draft detention" }
    if (!result.changed) return { ok: false, error: "Detention already reflects the current stop timestamps" }
    revalidateLoadViews(loadId)
    return { ok: true, amountCents: result.amountCents }
  } catch (err) {
    return actionError(err, "Could not draft detention")
  }
}

export async function logCheckCallAction(loadId: string, note: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:status")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    // loadId is a client string: prove the load is ours before writing an
    // event row against it (cross-table writes guard tenancy on both sides).
    const load = await getLoad(user.carrierId, loadId)
    if (!load) return { ok: false, error: "Load not found" }
    await addLoadEvent(user.carrierId, loadId, "check_call", { note: note.trim() }, { id: user.id, name: user.name })
    revalidateLoadViews(loadId)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Failed to log check call")
  }
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

/** Tenancy guard: entity_id comes from the client, so it must be proven to belong to the carrier. */
const DOCUMENT_ENTITY_REF: Record<string, CarrierRefField> = {
  load: "load_id", truck: "truck_id", trailer: "trailer_id", driver: "driver_id",
  customer: "customer_id", incident: "incident_id", facility: "facility_id",
  applicant: "applicant_id", message: "message_thread_id",
}

export async function uploadDocumentAction(formData: FormData): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("documents:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
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
    if (parsed.data.entity_type === "carrier") {
      if (parsed.data.entity_id !== user.carrierId) return { ok: false, error: "Not found" }
    } else {
      await assertCarrierRefs(user.carrierId, {
        [DOCUMENT_ENTITY_REF[parsed.data.entity_type]]: parsed.data.entity_id,
      })
    }
    const doc = await saveDocument({
      carrierId: user.carrierId,
      entityType: parsed.data.entity_type,
      entityId: parsed.data.entity_id,
      kind: parsed.data.kind,
      file,
      expiry: parsed.data.expiry ?? null,
      uploadedBy: user.id,
    })
    if (parsed.data.entity_type === "load") {
      await addLoadEvent(user.carrierId, parsed.data.entity_id, "document", {
        kind: parsed.data.kind, file: file.name,
      }, { id: user.id, name: user.name })
      revalidateLoadViews(parsed.data.entity_id)
    } else if (parsed.data.entity_type === "incident") {
      revalidatePath(`/hub/safety/${parsed.data.entity_id}`)
    } else if (parsed.data.entity_type === "facility") {
      revalidatePath(`/hub/facilities/${parsed.data.entity_id}`)
    } else if (parsed.data.entity_type === "applicant") {
      revalidatePath(`/hub/recruiting/${parsed.data.entity_id}`)
    } else if (parsed.data.entity_type === "truck" || parsed.data.entity_type === "trailer") {
      // Fleet detail pages live under /hub/fleet/{type}s/{id}, not /hub/{type}s/{id}.
      revalidatePath(`/hub/fleet/${parsed.data.entity_type}s/${parsed.data.entity_id}`)
    } else {
      revalidatePath(`/hub/${parsed.data.entity_type}s/${parsed.data.entity_id}`)
    }
    return { ok: true, id: doc.id }
  } catch (err) {
    return actionError(err, "Upload failed")
  }
}

export async function deleteDocumentAction(
  id: string,
  entityType: string,
  entityId: string
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("documents:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const deleted = await deleteDocument(user.carrierId, id)
    if (!deleted) return { ok: false, error: "Document not found" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "document", entityId: id, action: "delete",
      oldValue: { entityType, entityId },
    })
    if (entityType === "load") revalidateLoadViews(entityId)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Delete failed")
  }
}

// ---- Tracking share links ----

export async function createShareLinkAction(loadId: string): Promise<ActionResult & { token?: string }> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const link = await createShareLink(user.carrierId, loadId, user.id)
    await addLoadEvent(user.carrierId, loadId, "note", { note: "Tracking link created" }, { id: user.id, name: user.name })
    // Token stays off the audit row — it is the public /track secret.
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "share_link", entityId: link.id, action: "create",
      newValue: { loadId },
    })
    revalidateLoadViews(loadId)
    return { ok: true, id: link.id, token: link.token }
  } catch (err) {
    return actionError(err, "Failed to create tracking link")
  }
}

export async function revokeShareLinkAction(linkId: string, loadId: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    await revokeShareLink(user.carrierId, linkId)
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "share_link", entityId: linkId, action: "revoke",
      newValue: { loadId },
    })
    revalidateLoadViews(loadId)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Failed to revoke link")
  }
}

export async function renewShareLinkAction(linkId: string, loadId: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    await renewShareLink(user.carrierId, linkId)
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "share_link", entityId: linkId, action: "renew",
      newValue: { loadId },
    })
    revalidateLoadViews(loadId)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Failed to renew link")
  }
}
