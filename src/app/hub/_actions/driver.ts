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
import { logAudit } from "@/lib/hub/audit"
import { query, queryOne } from "@/lib/hub/db"
import { dollarsToCents, type LoadStatus } from "@/lib/hub/types"

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
    const stop = await setStopTimestamp(user.carrierId, stopId, loadId, field, new Date().toISOString())
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
 * Extras: an OS&D toggle on PODs starts the cargo-claim clock (Carmack:
 * delivery + 9 months), and receipts with an amount become reimbursable
 * expense entries for office review.
 */
export async function driverUploadDocument(formData: FormData): Promise<Result> {
  try {
    const user = await requireDriverUser()
    const loadId = String(formData.get("load_id") ?? "")
    const kind = String(formData.get("kind") ?? "")
    const requestId = String(formData.get("request_id") ?? "")
    const osd = formData.get("osd") === "1"
    const amountRaw = String(formData.get("amount") ?? "").replace(/[^0-9.]/g, "")
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

    // OS&D on a POD: flag the load and open a draft cargo claim right now —
    // a noted exception starts the claim clock at the moment of capture.
    if (osd && kind === "pod") {
      await query(
        `UPDATE hub.loads SET osd_flagged = TRUE, updated_at = NOW() WHERE carrier_id = $1 AND id = $2`,
        [user.carrierId, loadId]
      )
      await addLoadEvent(user.carrierId, loadId, "exception", {
        osd: true, by: user.name, note: "Driver noted exceptions on the POD (OS&D)",
      }, { id: user.id, name: user.name })
      await query(
        `INSERT INTO hub.claims (carrier_id, load_id, kind, status, filing_deadline, notes)
         SELECT $1, $2, 'cargo', 'open',
           (COALESCE(MAX(s.departed_at), MAX(s.arrived_at), NOW())::date + INTERVAL '9 months')::date,
           'Draft claim auto-opened: driver noted OS&D exceptions on the POD.'
         FROM hub.stops s WHERE s.load_id = $2 AND s.type = 'delivery'`,
        [user.carrierId, loadId]
      )
    }

    // Receipts with an amount become reimbursable expenses for office review.
    if (kind === "receipt" && amountRaw && Number(amountRaw) > 0) {
      const amountCents = dollarsToCents(amountRaw)
      const expenseRows = await query<{ id: string }>(
        `INSERT INTO hub.expenses (carrier_id, category, amount_cents, incurred_on, driver_id, load_id,
           reimbursable, receipt_document_id, memo)
         VALUES ($1, 'other', $2, CURRENT_DATE, $3, $4, TRUE, $5, $6) RETURNING id`,
        [
          user.carrierId, amountCents, user.driverId, loadId, doc.id,
          `Driver receipt — ${file.name}`,
        ]
      )
      await logAudit({
        carrierId: user.carrierId, actorId: user.id, actorName: user.name,
        entityType: "expense", entityId: expenseRows[0].id, action: "driver_receipt",
        newValue: { amountCents, loadId },
      })
    }

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
      title: osd
        ? `⚠ ${full?.reference ?? "Load"} — POD with OS&D exceptions from ${user.name} (draft claim opened)`
        : `${full?.reference ?? "Load"} — ${user.name} sent the ${kind.toUpperCase()}`,
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
    const added = await addFacilityNote(user.carrierId, input.facilityId, {
      body: input.body.trim() || input.tags.join(", "),
      tags: input.tags,
      author: { id: user.id, name: user.name, role: "driver" },
    })
    if (!added) return { ok: false, error: "Facility not found" }
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

/** Driver asks for a cash/fuel-code advance — office approves, settlement deducts. */
export async function driverRequestAdvance(input: {
  amount: string
  note?: string
}): Promise<Result> {
  try {
    const user = await requireDriverUser()
    const amountCents = dollarsToCents(input.amount)
    if (amountCents <= 0) {
      return { ok: false, error: "How much do you need?" }
    }
    if (amountCents > 100000) return { ok: false, error: "Over $1,000 — call the office instead" }
    const rows = await query<{ id: string }>(
      `INSERT INTO hub.advances (carrier_id, driver_id, amount_cents, issued_on, reference, status, requested_by, note)
       VALUES ($1, $2, $3, CURRENT_DATE, 'Driver request', 'pending', $4, $5) RETURNING id`,
      [user.carrierId, user.driverId, amountCents, user.id, input.note?.trim() || null]
    )
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "advance", entityId: rows[0].id, action: "requested",
      newValue: { amountCents },
    })
    await notifyRoles(user.carrierId, ["owner", "accountant"], {
      kind: "advance",
      title: `${user.name} asked for a $${(amountCents / 100).toFixed(2)} advance`,
      body: input.note?.trim() || undefined,
      link: "/hub/money/advances",
    })
    revalidatePath("/hub/driver/pay")
    revalidatePath("/hub/money/advances")
    return { ok: true, id: rows[0].id }
  } catch (err) {
    return fail(err, "Could not send the request")
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
