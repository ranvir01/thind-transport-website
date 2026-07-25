/**
 * Announcements (E3): broadcast to all or filtered drivers/roles, with
 * optional acknowledge-required (canvas signature) and an ack report.
 */
import { query, queryOne } from "./db"
import { notifyUser } from "./notify"
import type { Announcement } from "./types"

interface Audience {
  all?: boolean
  roles?: string[]
  driverIds?: string[]
}

/** Resolve the user ids an announcement targets. */
export async function audienceUserIds(carrierId: string, audience: Audience): Promise<string[]> {
  if (audience.driverIds?.length) {
    const rows = await query<{ id: string }>(
      `SELECT id FROM hub.users WHERE carrier_id = $1 AND active AND driver_id = ANY($2)`,
      [carrierId, audience.driverIds]
    )
    return rows.map((r) => r.id)
  }
  if (audience.roles?.length) {
    const rows = await query<{ id: string }>(
      `SELECT id FROM hub.users WHERE carrier_id = $1 AND active AND role = ANY($2)`,
      [carrierId, audience.roles]
    )
    return rows.map((r) => r.id)
  }
  const rows = await query<{ id: string }>(
    `SELECT id FROM hub.users WHERE carrier_id = $1 AND active`,
    [carrierId]
  )
  return rows.map((r) => r.id)
}

export async function createAnnouncement(
  carrierId: string,
  input: {
    title: string
    body: string
    audience: Audience
    requiresAck: boolean
    expiresAt?: string | null
    author: { id: string; name: string }
  }
): Promise<Announcement> {
  const rows = await query<Announcement>(
    `INSERT INTO hub.announcements (carrier_id, title, body, audience, requires_ack, created_by, created_by_name, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      carrierId, input.title, input.body, JSON.stringify(input.audience),
      input.requiresAck, input.author.id, input.author.name, input.expiresAt ?? null,
    ]
  )
  const announcement = rows[0]
  // Push to everyone targeted (best effort, after the row exists).
  const userIds = await audienceUserIds(carrierId, input.audience)
  await Promise.all(
    userIds
      .filter((id) => id !== input.author.id)
      .map((id) =>
        notifyUser(carrierId, id, {
          kind: "announcement",
          title: input.requiresAck ? `Action needed: ${input.title}` : input.title,
          body: input.body.slice(0, 140),
          link: "/hub/driver",
        })
      )
  )
  return announcement
}

/** Office list with ack progress. */
export async function listAnnouncements(carrierId: string): Promise<Announcement[]> {
  return query<Announcement>(
    `SELECT a.*,
       (SELECT COUNT(*)::int FROM hub.announcement_acks k WHERE k.announcement_id = a.id) AS ack_count
     FROM hub.announcements a
     WHERE a.carrier_id = $1
     ORDER BY a.created_at DESC LIMIT 50`,
    [carrierId]
  )
}

export async function getAnnouncement(carrierId: string, id: string): Promise<Announcement | null> {
  return queryOne<Announcement>(
    `SELECT * FROM hub.announcements WHERE carrier_id = $1 AND id = $2`,
    [carrierId, id]
  )
}

/** The acknowledgement report: who has signed, who is still outstanding. */
export async function ackReport(
  carrierId: string,
  announcementId: string
): Promise<{ acked: { name: string; acked_at: string; signed: boolean }[]; pending: { name: string }[] }> {
  const announcement = await getAnnouncement(carrierId, announcementId)
  if (!announcement) return { acked: [], pending: [] }
  const targets = await audienceUserIds(carrierId, announcement.audience ?? { all: true })
  const acks = await query<{ user_id: string; name: string; acked_at: string; signature: string | null }>(
    `SELECT k.user_id, u.name, k.acked_at, k.signature
     FROM hub.announcement_acks k JOIN hub.users u ON u.id = k.user_id AND u.carrier_id = $2
     WHERE k.announcement_id = $1 ORDER BY k.acked_at`,
    [announcementId, carrierId]
  )
  const ackedIds = new Set(acks.map((a) => a.user_id))
  const pendingUsers = await query<{ name: string }>(
    `SELECT name FROM hub.users WHERE id = ANY($1) ORDER BY name`,
    [targets.filter((id) => !ackedIds.has(id))]
  )
  return {
    acked: acks.map((a) => ({ name: a.name, acked_at: a.acked_at, signed: Boolean(a.signature) })),
    pending: pendingUsers,
  }
}

/** Announcements a user still needs to see/acknowledge (driver home pins these). */
export async function pendingAnnouncementsForUser(
  carrierId: string,
  userId: string,
  role: string,
  driverId: string | null
): Promise<Announcement[]> {
  const rows = await query<Announcement>(
    `SELECT a.*,
       (k.user_id IS NOT NULL) AS acked
     FROM hub.announcements a
     LEFT JOIN hub.announcement_acks k ON k.announcement_id = a.id AND k.user_id = $2
     WHERE a.carrier_id = $1
       AND (a.expires_at IS NULL OR a.expires_at > NOW())
       AND k.user_id IS NULL
     ORDER BY a.created_at DESC LIMIT 20`,
    [carrierId, userId]
  )
  // Audience filter in JS (audience JSON shapes are small and few).
  return rows.filter((a) => {
    const aud = (a.audience ?? { all: true }) as Audience
    if (aud.driverIds?.length) return driverId != null && aud.driverIds.includes(driverId)
    if (aud.roles?.length) return aud.roles.includes(role)
    return true
  })
}

export async function acknowledgeAnnouncement(
  announcementId: string,
  userId: string,
  signature?: string | null
): Promise<void> {
  await query(
    `INSERT INTO hub.announcement_acks (announcement_id, user_id, signature)
     VALUES ($1, $2, $3)
     ON CONFLICT (announcement_id, user_id) DO NOTHING`,
    [announcementId, userId, signature ?? null]
  )
}
