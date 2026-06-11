"use server"

/**
 * Driver-app server actions. Every one re-verifies that the signed-in user is
 * a driver AND owns the record it touches — query-layer enforcement, not UI.
 */
import { revalidatePath } from "next/cache"
import { requireDriverUser } from "@/lib/hub/session"
import {
  addLoadEvent, changeLoadStatus, setStopTimestamp, getLoad,
} from "@/lib/hub/loads"
import { driverOwnsLoad, DRIVER_STATUS_FLOW } from "@/lib/hub/driver-app"
import { saveDocument } from "@/lib/hub/documents"
import { addFacilityNote } from "@/lib/hub/facilities"
import { createTimeOffRequest, cancelTimeOff } from "@/lib/hub/timeoff"
import { acknowledgeAnnouncement } from "@/lib/hub/announcements"
import { notifyRoles } from "@/lib/hub/notify"
import { query, queryOne } from "@/lib/hub/db"
import type { LoadStatus } from "@/lib/hub/types"

interface Result {
  ok: boolean
  error?: string
  id?: string
}

function fail(err: unknown, fallback: string): Result {
  return { ok: false, error: err instanceof Error ? err.message : fallback }
}

const STATUS_WORDS: Record<string, string> = {
  at_pickup: "at the pickup",
  in_transit: "rolling",
  delivered: "delivered",
}

/** One-tap status advance on the driver's own load. */
export async function driverAdvanceStatus(loadId: string): Promise<Result> {
  try {
    const user = await requireDriverUser()
    const load = await driverOwnsLoad(user.carrierId, user.driverId, loadId)
    if (!load) return { ok: false, error: "That load isn't yours" }
    const next = DRIVER_STATUS_FLOW[load.status]
    if (!next) return { ok: false, error: "Nothing to update — dispatch takes it from here" }
    await changeLoadStatus(user.carrierId, loadId, next as LoadStatus, { id: user.id, name: user.name })
    const full = await getLoad(user.carrierId, loadId)
    await notifyRoles(user.carrierId, ["owner", "dispatcher"], {
      kind: "driver_status",
      title: `${full?.reference ?? "Load"} — ${user.name} is ${STATUS_WORDS[next] ?? next}`,
      link: `/hub/loads/${loadId}`,
    })
    revalidatePath("/hub/driver")
    return { ok: true }
  } catch (err) {
    return fail(err, "Could not update status")
  }
}

/** Arrived / departed taps write the stop timestamps detention math runs on. */
export async function driverStopTimestamp(
  stopId: string,
  loadId: string,
  field: "arrived_at" | "departed_at"
): Promise<Result> {
  try {
    const user = await requireDriverUser()
    const load = await driverOwnsLoad(user.carrierId, user.driverId, loadId)
    if (!load) return { ok: false, error: "That load isn't yours" }
    const stop = await setStopTimestamp(user.carrierId, stopId, field, new Date().toISOString())
    if (stop) {
      await addLoadEvent(user.carrierId, loadId, "geo", {
        stop_id: stopId, field, city: stop.city, state: stop.state, by: "driver",
      }, { id: user.id, name: user.name })
    }
    revalidatePath("/hub/driver")
    return { ok: true }
  } catch (err) {
    return fail(err, "Could not record the time")
  }
}

/** "Got it" — driver confirms the dispatch (Today screen tracks the silent ones). */
export async function driverAcknowledgeDispatch(loadId: string): Promise<Result> {
  try {
    const user = await requireDriverUser()
    const load = await driverOwnsLoad(user.carrierId, user.driverId, loadId)
    if (!load) return { ok: false, error: "That load isn't yours" }
    await query(
      `UPDATE hub.loads SET acknowledged_at = NOW(), acknowledged_by = $3
       WHERE carrier_id = $1 AND id = $2 AND acknowledged_at IS NULL`,
      [user.carrierId, loadId, user.id]
    )
    await addLoadEvent(user.carrierId, loadId, "acknowledged", { by: user.name }, { id: user.id, name: user.name })
    revalidatePath("/hub/driver")
    return { ok: true }
  } catch (err) {
    return fail(err, "Could not confirm")
  }
}

const DRIVER_UPLOAD_KINDS = new Set(["pod", "bol", "receipt", "other"])
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

/**
 * Camera/photo upload from the driver's phone: POD, BOL, receipts.
 * Auto-satisfies a matching open document request and tells the office.
 */
export async function driverUploadDocument(formData: FormData): Promise<Result> {
  try {
    const user = await requireDriverUser()
    const loadId = String(formData.get("load_id") ?? "")
    const kind = String(formData.get("kind") ?? "")
    const requestId = String(formData.get("request_id") ?? "")
    if (!DRIVER_UPLOAD_KINDS.has(kind)) return { ok: false, error: "Pick what the photo is" }
    const load = await driverOwnsLoad(user.carrierId, user.driverId, loadId)
    if (!load) return { ok: false, error: "That load isn't yours" }
    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Take or pick a photo first" }
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is over the 15MB limit" }

    const doc = await saveDocument({
      carrierId: user.carrierId,
      entityType: "load",
      entityId: loadId,
      kind: kind as "pod" | "bol" | "receipt" | "other",
      file,
      uploadedBy: user.id,
    })
    await addLoadEvent(user.carrierId, loadId, "document", {
      kind, file: file.name, by: "driver",
    }, { id: user.id, name: user.name })

    // Close the loop on any matching open request (pinned on the driver home).
    if (requestId) {
      await query(
        `UPDATE hub.document_requests
         SET status = 'satisfied', satisfied_document_id = $4, satisfied_at = NOW()
         WHERE carrier_id = $1 AND id = $2 AND driver_id = $3 AND status = 'open'`,
        [user.carrierId, requestId, user.driverId, doc.id]
      )
    } else {
      await query(
        `UPDATE hub.document_requests
         SET status = 'satisfied', satisfied_document_id = $4, satisfied_at = NOW()
         WHERE carrier_id = $1 AND driver_id = $2 AND status = 'open' AND kind = $3
           AND (load_id IS NULL OR load_id = $5)`,
        [user.carrierId, user.driverId, kind, doc.id, loadId]
      )
    }

    const full = await getLoad(user.carrierId, loadId)
    await notifyRoles(user.carrierId, ["owner", "dispatcher", "accountant"], {
      kind: "driver_document",
      title: `${full?.reference ?? "Load"} — ${user.name} sent the ${kind.toUpperCase()}`,
      link: `/hub/loads/${loadId}`,
    })
    revalidatePath("/hub/driver")
    revalidatePath(`/hub/loads/${loadId}`)
    return { ok: true, id: doc.id }
  } catch (err) {
    return fail(err, "Upload failed — try again when you have signal")
  }
}

/** Two-tap facility note after departure (E2). */
export async function driverAddFacilityNote(input: {
  facilityId: string
  body: string
  tags: string[]
}): Promise<Result> {
  try {
    const user = await requireDriverUser()
    if (!input.body.trim() && input.tags.length === 0) {
      return { ok: false, error: "Say something first — even one tag helps" }
    }
    await addFacilityNote(user.carrierId, input.facilityId, {
      body: input.body.trim() || input.tags.join(", "),
      tags: input.tags,
      author: { id: user.id, name: user.name, role: "driver" },
    })
    revalidatePath("/hub/driver")
    return { ok: true }
  } catch (err) {
    return fail(err, "Could not save the note")
  }
}

/** Home-time request — approved time blocks the planner (E5 ↔ E1). */
export async function driverRequestTimeOff(input: {
  startDate: string
  endDate: string
  kind: string
  reason?: string
}): Promise<Result> {
  try {
    const user = await requireDriverUser()
    if (!input.startDate || !input.endDate) return { ok: false, error: "Pick the days" }
    if (input.endDate < input.startDate) return { ok: false, error: "End date is before the start" }
    const request = await createTimeOffRequest(user.carrierId, user.driverId, {
      startDate: input.startDate,
      endDate: input.endDate,
      kind: input.kind,
      reason: input.reason ?? null,
    })
    await notifyRoles(user.carrierId, ["owner", "dispatcher"], {
      kind: "time_off",
      title: `${user.name} asked for time off`,
      body: `${input.startDate} → ${input.endDate}`,
      link: "/hub/drivers",
    })
    revalidatePath("/hub/driver/timeoff")
    return { ok: true, id: request.id }
  } catch (err) {
    return fail(err, "Could not send the request")
  }
}

export async function driverCancelTimeOff(id: string): Promise<Result> {
  try {
    const user = await requireDriverUser()
    const ok = await cancelTimeOff(user.carrierId, id, user.driverId)
    revalidatePath("/hub/driver/timeoff")
    return ok ? { ok: true } : { ok: false, error: "Already decided — call the office" }
  } catch (err) {
    return fail(err, "Could not cancel")
  }
}

/** Acknowledge an announcement (optionally with a finger signature). */
export async function driverAcknowledgeAnnouncement(
  announcementId: string,
  signature?: string | null
): Promise<Result> {
  try {
    const user = await requireDriverUser()
    const announcement = await queryOne<{ id: string }>(
      `SELECT id FROM hub.announcements WHERE carrier_id = $1 AND id = $2`,
      [user.carrierId, announcementId]
    )
    if (!announcement) return { ok: false, error: "Announcement not found" }
    await acknowledgeAnnouncement(announcementId, user.id, signature)
    revalidatePath("/hub/driver")
    return { ok: true }
  } catch (err) {
    return fail(err, "Could not acknowledge")
  }
}
