/**
 * Broker status updates — the check-call the broker no longer has to make.
 *
 * On at_pickup / in_transit / delivered, email the customer's status-updates
 * address one line of fact plus the tracking link. Datatruck sells this as an
 * "AI Updater"; every input here already existed (position pings, share links,
 * the status ledger), so it is a hook, not a model.
 *
 * The rules, each of which a test pins:
 *  - OPT-IN per customer. `status_updates_email` null means nothing sends.
 *    billing_email is never a fallback — an AR inbox at a brokerage is the
 *    wrong place for tracking mail (owner decision, migration 031).
 *  - Facts, not predictions. The ETA rides along on the in_transit update;
 *    a slipping ETA later goes to the OFFICE (notifyRoles), never the broker.
 *  - Never on cancel, never from the sandbox, never to a reserved domain.
 *  - Once per (load, stage), recorded in load_events under the existing
 *    'message' kind so no constraint migration was needed.
 *  - Silent when SMTP is unset (owner-blocked, HANDOFF 7b): the return value
 *    says why, nothing is recorded, nothing throws.
 *
 * Called from changeLoadStatus AFTER its COMMIT, best-effort: a failure here
 * must never undo a status change that already happened.
 */
import { query, queryOne } from "./db"
import { createMailTransport, isEmailConfigured, mailFrom } from "../mailer"
import { isSandboxCarrier } from "./sandbox"
import { createShareLink } from "./sharelinks"
import { loadEta, type LoadEta } from "./eta-load"
import { formatEta } from "./eta"
import { notifyRoles } from "./notify"

export type BrokerUpdateStage = "at_pickup" | "in_transit" | "delivered"
export const BROKER_UPDATE_STAGES: readonly BrokerUpdateStage[] = ["at_pickup", "in_transit", "delivered"]

export function isBrokerUpdateStage(status: string): status is BrokerUpdateStage {
  return (BROKER_UPDATE_STAGES as readonly string[]).includes(status)
}

export type BrokerUpdateResult =
  | { sent: true; to: string; stage: BrokerUpdateStage }
  | {
      sent: false
      reason:
        | "sandbox"
        | "no_load"
        | "cancelled"
        | "opted_out"
        | "reserved_domain"
        | "already_sent"
        | "not_configured"
        | "send_failed"
    }

/** RFC 2606 / 6761 names never deliver; the demo tenant's brokers are all of these. */
const RESERVED_DOMAIN = /(@|\.)(example\.com|example\.net|example\.org)$|\.(example|test|invalid|localhost)$/i

export function isReservedAddress(email: string): boolean {
  return RESERVED_DOMAIN.test(email.trim())
}

/**
 * Absolute origin for links in outbound mail. The app's own host when one is
 * configured (app-origin.ts documents NEXT_PUBLIC_APP_HOST as a bare hostname),
 * else the site. Never a relative path — this lands in someone else's inbox.
 */
export function publicOrigin(): string {
  const appHost = (process.env.NEXT_PUBLIC_APP_HOST ?? "").trim()
  if (appHost) return `https://${appHost.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim()
  if (site) return site.replace(/\/+$/, "")
  return "https://thindtransport.com"
}

interface LoadRow {
  reference: string
  customer_reference: string | null
  status: string
  customer_name: string | null
  status_updates_email: string | null
  carrier_name: string
}

interface StopRow {
  type: "pickup" | "delivery"
  city: string
  state: string
}

function place(stop: StopRow | undefined, fallback: string): string {
  return stop ? `${stop.city}, ${stop.state}` : fallback
}

/** The one line of fact per stage. Exported so the wording is pinned by a test, not a screenshot. */
export function updateLine(stage: BrokerUpdateStage, stops: StopRow[], arrival: LoadEta | null): string {
  const pickup = stops.find((s) => s.type === "pickup")
  const delivery = [...stops].reverse().find((s) => s.type === "delivery")
  switch (stage) {
    case "at_pickup":
      return `Our truck has arrived at pickup in ${place(pickup, "the pickup location")}.`
    case "in_transit": {
      const eta = arrival && arrival.target.type === "delivery" ? ` ETA ${formatEta(arrival.eta)}.` : ""
      return `Picked up and rolling toward ${place(delivery, "delivery")}.${eta}`
    }
    case "delivered":
      return `Delivered in ${place(delivery, "the delivery location")}.`
  }
}

async function liveTrackingToken(carrierId: string, loadId: string, actorId: string | null): Promise<string> {
  // Reuse the newest live link rather than minting one per email: the broker
  // should keep landing on the same URL for the whole shipment.
  const existing = await queryOne<{ token: string }>(
    `SELECT token FROM hub.share_links
     WHERE carrier_id = $1 AND load_id = $2 AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC LIMIT 1`,
    [carrierId, loadId]
  )
  if (existing) return existing.token
  const link = await createShareLink(carrierId, loadId, actorId)
  return link.token
}

export async function sendBrokerUpdate(
  carrierId: string,
  loadId: string,
  stage: BrokerUpdateStage,
  opts: { actorId?: string | null } = {}
): Promise<BrokerUpdateResult> {
  if (isSandboxCarrier(carrierId)) return { sent: false, reason: "sandbox" }

  const load = await queryOne<LoadRow>(
    `SELECT l.reference, l.customer_reference, l.status,
            c.name AS customer_name, c.status_updates_email,
            car.name AS carrier_name
     FROM hub.loads l
     JOIN hub.carriers car ON car.id = l.carrier_id
     LEFT JOIN hub.customers c ON c.id = l.customer_id AND c.carrier_id = l.carrier_id
     WHERE l.carrier_id = $1 AND l.id = $2 AND l.deleted_at IS NULL`,
    [carrierId, loadId]
  )
  if (!load) return { sent: false, reason: "no_load" }
  if (load.status === "cancelled") return { sent: false, reason: "cancelled" }

  const to = (load.status_updates_email ?? "").trim()
  if (!to) return { sent: false, reason: "opted_out" }
  if (isReservedAddress(to)) return { sent: false, reason: "reserved_domain" }

  const already = await queryOne<{ id: number }>(
    `SELECT id FROM hub.load_events
     WHERE carrier_id = $1 AND load_id = $2 AND kind = 'message'
       AND payload->>'type' = 'broker_update' AND payload->>'stage' = $3
     LIMIT 1`,
    [carrierId, loadId, stage]
  )
  if (already) return { sent: false, reason: "already_sent" }

  if (!isEmailConfigured()) return { sent: false, reason: "not_configured" }

  const [stops, arrival] = await Promise.all([
    query<StopRow>(
      `SELECT type, city, state FROM hub.stops
       WHERE carrier_id = $1 AND load_id = $2 ORDER BY sequence`,
      [carrierId, loadId]
    ),
    stage === "in_transit" ? loadEta(carrierId, loadId).catch(() => null) : Promise.resolve(null),
  ])

  const token = await liveTrackingToken(carrierId, loadId, opts.actorId ?? null)
  const trackUrl = `${publicOrigin()}/track/${token}`
  const line = updateLine(stage, stops, arrival)
  const ref = load.customer_reference ? ` (your ref ${load.customer_reference})` : ""
  const subject = `${load.carrier_name} — Load ${load.reference}${ref}: ${
    stage === "at_pickup" ? "at pickup" : stage === "in_transit" ? "picked up" : "delivered"
  }`
  const text = [
    line,
    "",
    `Track it live: ${trackUrl}`,
    "",
    `Sent automatically by ${load.carrier_name}. Reply to reach dispatch.`,
  ].join("\n")

  try {
    await createMailTransport().sendMail({ from: mailFrom(load.carrier_name), to, subject, text })
  } catch (err) {
    console.error("broker update send failed:", err)
    return { sent: false, reason: "send_failed" }
  }

  await query(
    `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
     VALUES ($1, $2, 'message', NULL, 'System', $3)`,
    [
      carrierId,
      loadId,
      JSON.stringify({
        type: "broker_update", stage, to,
        eta: arrival ? arrival.eta.at.toISOString() : null,
      }),
    ]
  )

  // Facts went to the broker; the prediction goes to the office. An hour past
  // the delivery window is where a phone call starts being worth making.
  if (arrival && arrival.eta.lateMinutes > 60) {
    await notifyRoles(carrierId, ["dispatcher", "owner"], {
      kind: "eta_late",
      title: `${load.reference} is running ${Math.round(arrival.eta.lateMinutes / 60)}h behind its delivery window`,
      body: `ETA ${formatEta(arrival.eta)} into ${arrival.target.city}, ${arrival.target.state}. The broker got the pickup notice, not the slip — call if it matters.`,
      link: `/hub/loads/${loadId}`,
    }).catch(() => undefined)
  }

  return { sent: true, to, stage }
}
