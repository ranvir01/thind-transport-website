/**
 * Notification spine: writes in-app notification rows and pushes them to any
 * registered Web Push subscriptions (VAPID). Everything urgent flows through
 * here — new dispatch, messages, document requests, compliance flags, tasks.
 *
 * Push is strictly best-effort: a missing VAPID key pair or an expired
 * subscription must never break the action that triggered the notification.
 */
import webpush from "web-push"
import { query } from "./db"
import { PRODUCT } from "./product"

export interface NotifyInput {
  kind: string
  title: string
  body?: string | null
  link?: string | null
}

let vapidReady: boolean | null = null

function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    vapidReady = false
    return false
  }
  try {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_CONTACT ?? PRODUCT.supportEmail}`,
      publicKey,
      privateKey
    )
    vapidReady = true
  } catch (err) {
    console.error("VAPID setup failed:", err)
    vapidReady = false
  }
  return vapidReady
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

/** Notify one user: in-app row + best-effort push to their devices. */
export async function notifyUser(
  carrierId: string,
  userId: string,
  input: NotifyInput
): Promise<void> {
  try {
    await query(
      `INSERT INTO hub.notifications (carrier_id, user_id, kind, title, body, link)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [carrierId, userId, input.kind, input.title, input.body ?? null, input.link ?? null]
    )
  } catch (err) {
    console.error("notification insert failed:", err)
    return
  }
  await pushToUser(userId, input)
}

/** Notify every active user of the given roles in a carrier. */
export async function notifyRoles(
  carrierId: string,
  roles: string[],
  input: NotifyInput,
  options: { excludeUserId?: string } = {}
): Promise<void> {
  const users = await query<{ id: string }>(
    `SELECT id FROM hub.users WHERE carrier_id = $1 AND active AND role = ANY($2)`,
    [carrierId, roles]
  )
  await Promise.all(
    users
      .filter((u) => u.id !== options.excludeUserId)
      .map((u) => notifyUser(carrierId, u.id, input))
  )
}

/** Notify the user account linked to a driver record (if any). */
export async function notifyDriver(
  carrierId: string,
  driverId: string,
  input: NotifyInput
): Promise<void> {
  const users = await query<{ id: string }>(
    `SELECT id FROM hub.users WHERE carrier_id = $1 AND active AND driver_id = $2`,
    [carrierId, driverId]
  )
  await Promise.all(users.map((u) => notifyUser(carrierId, u.id, input)))
}

async function pushToUser(userId: string, input: NotifyInput): Promise<void> {
  if (!ensureVapid()) return
  const subs = await query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
    `SELECT id, endpoint, p256dh, auth FROM hub.push_subscriptions WHERE user_id = $1`,
    [userId]
  )
  const payload = JSON.stringify({
    title: input.title,
    body: input.body ?? "",
    link: input.link ?? "/hub",
  })
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 }
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          // Subscription expired or revoked — clean it up.
          await query(`DELETE FROM hub.push_subscriptions WHERE id = $1`, [sub.id]).catch(() => {})
        } else {
          console.error("web push failed:", err)
        }
      }
    })
  )
}

// ---- In-app feed ----

export async function listNotifications(carrierId: string, userId: string, limit = 30) {
  return query<{
    id: number
    kind: string
    title: string
    body: string | null
    link: string | null
    read_at: string | null
    created_at: string
  }>(
    `SELECT id, kind, title, body, link, read_at, created_at
     FROM hub.notifications WHERE carrier_id = $1 AND user_id = $2
     ORDER BY created_at DESC LIMIT $3`,
    [carrierId, userId, limit]
  )
}

export async function unreadCount(carrierId: string, userId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM hub.notifications WHERE carrier_id = $1 AND user_id = $2 AND read_at IS NULL`,
    [carrierId, userId]
  )
  return Number(rows[0]?.count ?? 0)
}

export async function markAllRead(carrierId: string, userId: string): Promise<void> {
  await query(
    `UPDATE hub.notifications SET read_at = NOW() WHERE carrier_id = $1 AND user_id = $2 AND read_at IS NULL`,
    [carrierId, userId]
  )
}

// ---- Push subscription management ----

export async function savePushSubscription(
  carrierId: string,
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
): Promise<void> {
  await query(
    `INSERT INTO hub.push_subscriptions (carrier_id, user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [carrierId, userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, userAgent ?? null]
  )
}

export async function removePushSubscription(
  carrierId: string,
  userId: string,
  endpoint: string
): Promise<void> {
  await query(
    `DELETE FROM hub.push_subscriptions WHERE carrier_id = $1 AND user_id = $2 AND endpoint = $3`,
    [carrierId, userId, endpoint]
  )
}
