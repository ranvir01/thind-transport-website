"use server"

/**
 * Messaging actions shared by the office and the driver app (E3).
 * Access control: office roles reach every thread in their carrier;
 * drivers only reach their own direct thread and their loads' threads.
 */
import { revalidatePath } from "next/cache"
import { getHubUser } from "@/lib/hub/session"
import { OFFICE_ROLES } from "@/lib/hub/types"
import {
  ensureDirectThread, ensureLoadThread, getThread, markThreadRead, sendMessage,
} from "@/lib/hub/messages"
import { saveDocument } from "@/lib/hub/documents"
import { notifyDriver, notifyRoles } from "@/lib/hub/notify"
import { queryOne } from "@/lib/hub/db"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
  threadId?: string
}

async function driverIdForUser(userId: string, carrierId: string): Promise<string | null> {
  const row = await queryOne<{ driver_id: string | null }>(
    `SELECT driver_id FROM hub.users WHERE id = $1 AND carrier_id = $2`,
    [userId, carrierId]
  )
  return row?.driver_id ?? null
}

/** Can this user touch this thread? (query layer, not UI) */
async function canAccessThread(
  user: { id: string; role: string; carrierId: string },
  threadId: string
): Promise<{ ok: boolean; loadId?: string | null; driverId?: string | null }> {
  const thread = await getThread(user.carrierId, threadId)
  if (!thread) return { ok: false }
  if (OFFICE_ROLES.includes(user.role as (typeof OFFICE_ROLES)[number])) {
    return { ok: true, loadId: thread.load_id, driverId: thread.driver_id }
  }
  if (user.role !== "driver") return { ok: false }
  const myDriverId = await driverIdForUser(user.id, user.carrierId)
  if (!myDriverId) return { ok: false }
  if (thread.kind === "direct" && thread.driver_id === myDriverId) {
    return { ok: true, driverId: myDriverId }
  }
  if (thread.kind === "load" && thread.load_id) {
    const owns = await queryOne<{ id: string }>(
      `SELECT id FROM hub.loads WHERE carrier_id = $1 AND id = $2 AND driver_id = $3`,
      [user.carrierId, thread.load_id, myDriverId]
    )
    if (owns) return { ok: true, loadId: thread.load_id, driverId: myDriverId }
  }
  return { ok: false }
}

/** Open (or create) a thread: office picks a load or a driver; drivers their own. */
export async function openThread(target: { loadId?: string; driverId?: string }): Promise<Result> {
  const user = await getHubUser()
  if (!user) return { ok: false, error: "Not signed in" }
  try {
    if (target.loadId) {
      // Both office and the assigned driver may open a load thread.
      if (!OFFICE_ROLES.includes(user.role)) {
        const myDriverId = await driverIdForUser(user.id, user.carrierId)
        const owns = myDriverId
          ? await queryOne<{ id: string }>(
              `SELECT id FROM hub.loads WHERE carrier_id = $1 AND id = $2 AND driver_id = $3`,
              [user.carrierId, target.loadId, myDriverId]
            )
          : null
        if (!owns) return { ok: false, error: "Not your load" }
      }
      const threadId = await ensureLoadThread(user.carrierId, target.loadId)
      return { ok: true, threadId }
    }
    if (target.driverId) {
      if (OFFICE_ROLES.includes(user.role)) {
        const threadId = await ensureDirectThread(user.carrierId, target.driverId)
        return { ok: true, threadId }
      }
      const myDriverId = await driverIdForUser(user.id, user.carrierId)
      if (myDriverId !== target.driverId) return { ok: false, error: "Not your thread" }
      const threadId = await ensureDirectThread(user.carrierId, target.driverId)
      return { ok: true, threadId }
    }
    return { ok: false, error: "Pick a load or a driver" }
  } catch (err) {
    return actionError(err, "Could not open thread")
  }
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

/** Send a message (text and/or photo) into a thread the sender can access. */
export async function sendMessageAction(formData: FormData): Promise<Result> {
  const user = await getHubUser()
  if (!user) return { ok: false, error: "Not signed in" }
  const threadId = String(formData.get("thread_id") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  const file = formData.get("file")
  const hasFile = file instanceof File && file.size > 0
  if (!body && !hasFile) return { ok: false, error: "Type something or attach a photo" }

  const access = await canAccessThread(user, threadId)
  if (!access.ok) return { ok: false, error: "You can't message this thread" }

  try {
    let documentId: string | null = null
    if (hasFile) {
      if ((file as File).size > MAX_UPLOAD_BYTES) return { ok: false, error: "Photo is over the 15MB limit" }
      const doc = await saveDocument({
        carrierId: user.carrierId,
        entityType: access.loadId ? "load" : "message",
        entityId: access.loadId ?? threadId,
        kind: access.loadId ? "other" : "message_photo",
        file: file as File,
        uploadedBy: user.id,
      })
      documentId = doc.id
    }
    await sendMessage(user.carrierId, threadId, {
      body,
      documentId,
      sender: { id: user.id, name: user.name, role: user.role },
    })

    // Push the other side.
    const preview = body ? body.slice(0, 100) : "📷 Photo"
    if (OFFICE_ROLES.includes(user.role)) {
      const thread = await getThread(user.carrierId, threadId)
      const targetDriverId =
        thread?.driver_id ??
        (thread?.load_id
          ? (await queryOne<{ driver_id: string | null }>(
              `SELECT driver_id FROM hub.loads WHERE id = $1 AND carrier_id = $2`,
              [thread.load_id, user.carrierId]
            ))?.driver_id ?? null
          : null)
      if (targetDriverId) {
        await notifyDriver(user.carrierId, targetDriverId, {
          kind: "message",
          title: `Message from ${user.name}`,
          body: preview,
          link: `/hub/driver/messages/${threadId}`,
        })
      }
    } else {
      await notifyRoles(
        user.carrierId,
        [...OFFICE_ROLES],
        {
          kind: "message",
          title: `Message from ${user.name}`,
          body: preview,
          link: `/hub/messages/${threadId}`,
        },
        { excludeUserId: user.id }
      )
    }

    revalidatePath(`/hub/messages/${threadId}`)
    revalidatePath(`/hub/driver/messages/${threadId}`)
    revalidatePath("/hub/messages")
    revalidatePath("/hub/driver/messages")
    return { ok: true, threadId }
  } catch (err) {
    return actionError(err, "Could not send")
  }
}

export async function markThreadReadAction(threadId: string): Promise<Result> {
  const user = await getHubUser()
  if (!user) return { ok: false, error: "Not signed in" }
  const access = await canAccessThread(user, threadId)
  if (!access.ok) return { ok: false, error: "No access" }
  await markThreadRead(threadId, user.id)
  return { ok: true }
}
