"use server"

/** Office-side comms actions: announcements, document requests, time-off decisions. */
import { revalidatePath } from "next/cache"
import { requireOfficeUser } from "@/lib/hub/session"
import { createAnnouncement } from "@/lib/hub/announcements"
import { decideTimeOff } from "@/lib/hub/timeoff"
import { notifyDriver } from "@/lib/hub/notify"
import { logAudit } from "@/lib/hub/audit"
import { query, queryOne } from "@/lib/hub/db"

interface Result {
  ok: boolean
  error?: string
  id?: string
}

export async function createAnnouncementAction(input: {
  title: string
  body: string
  audience: "all" | "drivers" | "office"
  requiresAck: boolean
  expiresAt?: string
}): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    if (!input.title.trim() || !input.body.trim()) {
      return { ok: false, error: "Title and message are both needed" }
    }
    const audience =
      input.audience === "drivers"
        ? { roles: ["driver"] }
        : input.audience === "office"
          ? { roles: ["owner", "dispatcher", "accountant"] }
          : { all: true }
    const announcement = await createAnnouncement(user.carrierId, {
      title: input.title.trim(),
      body: input.body.trim(),
      audience,
      requiresAck: input.requiresAck,
      expiresAt: input.expiresAt || null,
      author: { id: user.id, name: user.name },
    })
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "announcement", entityId: announcement.id, action: "create",
      newValue: { title: input.title, requiresAck: input.requiresAck, audience: input.audience },
    })
    revalidatePath("/hub/messages/announcements")
    return { ok: true, id: announcement.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not send announcement" }
  }
}

export async function requestDocumentAction(input: {
  driverId: string
  kind: string
  loadId?: string
  note?: string
}): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    const driver = await queryOne<{ id: string; name: string }>(
      `SELECT id, first_name || ' ' || last_name AS name FROM hub.drivers
       WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [user.carrierId, input.driverId]
    )
    if (!driver) return { ok: false, error: "Driver not found" }
    const rows = await query<{ id: string }>(
      `INSERT INTO hub.document_requests (carrier_id, driver_id, load_id, kind, note, requested_by, requested_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        user.carrierId, input.driverId, input.loadId || null, input.kind,
        input.note?.trim() || null, user.id, user.name,
      ]
    )
    await notifyDriver(user.carrierId, input.driverId, {
      kind: "document_request",
      title: "The office needs paperwork from you",
      body: input.note?.trim() || `Please send your ${input.kind.replace(/_/g, " ")}`,
      link: "/hub/driver",
    })
    revalidatePath("/hub/driver")
    revalidatePath(`/hub/drivers/${input.driverId}`)
    return { ok: true, id: rows[0].id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not send the request" }
  }
}

export async function cancelDocumentRequestAction(id: string): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    await query(
      `UPDATE hub.document_requests SET status = 'cancelled'
       WHERE carrier_id = $1 AND id = $2 AND status = 'open'`,
      [user.carrierId, id]
    )
    revalidatePath("/hub/driver")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not cancel" }
  }
}

export async function decideTimeOffAction(
  id: string,
  decision: "approved" | "denied"
): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    const request = await decideTimeOff(user.carrierId, id, decision, { id: user.id, name: user.name })
    if (!request) return { ok: false, error: "Already decided" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "time_off_request", entityId: id, action: decision,
      newValue: { driver: request.driver_id, start: request.start_date, end: request.end_date },
    })
    await notifyDriver(user.carrierId, request.driver_id, {
      kind: "time_off",
      title: decision === "approved" ? "Time off approved 🎉" : "Time off request denied",
      body:
        decision === "approved"
          ? "It's blocked on the planner — dispatch can't book over it."
          : "Talk to dispatch if this is a problem.",
      link: "/hub/driver/timeoff",
    })
    revalidatePath("/hub/planner")
    revalidatePath("/hub/drivers")
    revalidatePath("/hub/driver/timeoff")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not decide" }
  }
}
