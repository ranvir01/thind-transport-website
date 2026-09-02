import { randomBytes } from "crypto"
import { query, queryOne } from "./db"
import { assertCarrierRefs } from "./tenancy"
import { loadEta } from "./eta-load"
import { latestPickupVerification } from "./pickup-verifications"
import { formatEta } from "./eta"
import type { Load, Stop } from "./types"

export interface ShareLink {
  id: string
  load_id: string
  token: string
  revoked_at: string | null
  expires_at: string | null
  created_at: string
}

// How long a freshly-minted or renewed tracking link stays live. Loads
// clear in days, not weeks — 30 gives brokers room to keep checking a
// slow-paying or disputed shipment without a link staying reachable forever.
const SHARE_LINK_TTL_DAYS = 30

export async function listShareLinks(carrierId: string, loadId: string): Promise<ShareLink[]> {
  return query<ShareLink>(
    `SELECT * FROM hub.share_links WHERE carrier_id = $1 AND load_id = $2 ORDER BY created_at DESC`,
    [carrierId, loadId]
  )
}

export async function createShareLink(
  carrierId: string,
  loadId: string,
  /** Null for links the system mints itself (broker status emails). */
  createdBy: string | null
): Promise<ShareLink> {
  await assertCarrierRefs(carrierId, { load_id: loadId })
  // 32 hex chars = 128 bits of entropy
  const token = randomBytes(16).toString("hex")
  const rows = await query<ShareLink>(
    `INSERT INTO hub.share_links (carrier_id, load_id, token, created_by, expires_at)
     VALUES ($1,$2,$3,$4, NOW() + $5 * INTERVAL '1 day') RETURNING *`,
    [carrierId, loadId, token, createdBy, SHARE_LINK_TTL_DAYS]
  )
  return rows[0]
}

export async function revokeShareLink(carrierId: string, id: string): Promise<void> {
  await query(
    `UPDATE hub.share_links SET revoked_at = NOW() WHERE carrier_id = $1 AND id = $2`,
    [carrierId, id]
  )
}

/** Push a link's expiry another SHARE_LINK_TTL_DAYS out from now — for a link
 *  that's about to lapse (or already has) but the broker still needs it. A
 *  revoked link can't be renewed; revoke is meant to be final. */
export async function renewShareLink(carrierId: string, id: string): Promise<void> {
  await query(
    `UPDATE hub.share_links SET expires_at = NOW() + $3 * INTERVAL '1 day'
     WHERE carrier_id = $1 AND id = $2 AND revoked_at IS NULL`,
    [carrierId, id, SHARE_LINK_TTL_DAYS]
  )
}

/** Public-safe stop for the unauthenticated /track page: same discipline as the
 *  portal's PortalStop — no facility name/address, pickup/PO refs, notes, or raw GPS. */
export type TrackedStop = Pick<
  Stop,
  "id" | "sequence" | "type" | "city" | "state" | "fcfs" | "appt_start" | "appt_end" | "arrived_at" | "departed_at"
>

export interface TrackedLoad {
  load: Pick<Load, "id" | "reference" | "status" | "equipment" | "truck_id">
  carrierName: string
  stops: TrackedStop[]
  latestPosition: { lat: number; lng: number; ts: string } | null
  /**
   * Arrival estimate at the next stop, or null when we genuinely do not know
   * (no ping, a ping too old to trust, an ungeocoded stop). Label only —
   * miles and drive time stay internal, and the time is rounded to 5 minutes
   * so it reads as an estimate, never a promise.
   */
  eta: { at: string; label: string; stopType: "pickup" | "delivery"; late: boolean } | null
  /**
   * True only on a POSITIVE verification (driver, location and photo all
   * matched). Never "unverified": an offline driver or a denied GPS prompt is
   * the usual case, and a public page must not read it as an accusation.
   */
  pickupVerified: boolean
}

/** Public lookup by token — exposes status + stops + city-level position only. */
export async function getTrackedLoad(token: string): Promise<TrackedLoad | null> {
  const link = await queryOne<{ load_id: string; carrier_id: string }>(
    `SELECT load_id, carrier_id FROM hub.share_links
     WHERE token = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
    [token]
  )
  if (!link) return null

  const load = await queryOne<Load & { carrier_name: string }>(
    `SELECT l.id, l.reference, l.status, l.equipment, l.truck_id, c.name AS carrier_name
     FROM hub.loads l JOIN hub.carriers c ON c.id = l.carrier_id
     WHERE l.id = $1 AND l.carrier_id = $2 AND l.deleted_at IS NULL`,
    [link.load_id, link.carrier_id]
  )
  if (!load) return null

  const stops = await query<TrackedStop>(
    `SELECT id, sequence, type, city, state, fcfs, appt_start, appt_end, arrived_at, departed_at
     FROM hub.stops WHERE load_id = $1 AND carrier_id = $2 ORDER BY sequence`,
    [link.load_id, link.carrier_id]
  )

  let latestPosition: { lat: number; lng: number; ts: string } | null = null
  if (load.truck_id && ["dispatched", "at_pickup", "in_transit"].includes(load.status)) {
    const ping = await queryOne<{ lat: number; lng: number; ts: string }>(
      `SELECT lat, lng, ts FROM hub.position_pings WHERE truck_id = $1 AND carrier_id = $2 ORDER BY ts DESC LIMIT 1`,
      [load.truck_id, link.carrier_id]
    )
    if (ping) {
      // City-level only: round to ~1.1km so raw GPS history is never exposed
      latestPosition = {
        lat: Math.round(ping.lat * 100) / 100,
        lng: Math.round(ping.lng * 100) / 100,
        ts: ping.ts,
      }
    }
  }

  // Only while the position is being shared: loadEta itself refuses
  // non-rolling statuses, but keying it to the same gate keeps the public
  // page's two live facts (position, ETA) appearing and disappearing together.
  const [arrival, verification] = await Promise.all([
    latestPosition ? loadEta(link.carrier_id, link.load_id).catch(() => null) : Promise.resolve(null),
    latestPickupVerification(link.carrier_id, link.load_id).catch(() => null),
  ])

  return {
    load: { id: load.id, reference: load.reference, status: load.status, equipment: load.equipment, truck_id: load.truck_id },
    carrierName: load.carrier_name,
    stops,
    latestPosition,
    eta: arrival
      ? {
          at: arrival.eta.at.toISOString(),
          label: formatEta(arrival.eta),
          stopType: arrival.target.type,
          late: arrival.eta.lateMinutes > 60,
        }
      : null,
    pickupVerified: verification?.result === "verified",
  }
}
