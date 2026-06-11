import { randomBytes } from "crypto"
import { query, queryOne } from "./db"
import type { Load, Stop } from "./types"

export interface ShareLink {
  id: string
  load_id: string
  token: string
  revoked_at: string | null
  created_at: string
}

export async function listShareLinks(carrierId: string, loadId: string): Promise<ShareLink[]> {
  return query<ShareLink>(
    `SELECT * FROM hub.share_links WHERE carrier_id = $1 AND load_id = $2 ORDER BY created_at DESC`,
    [carrierId, loadId]
  )
}

export async function createShareLink(
  carrierId: string,
  loadId: string,
  createdBy: string
): Promise<ShareLink> {
  // 32 hex chars = 128 bits of entropy
  const token = randomBytes(16).toString("hex")
  const rows = await query<ShareLink>(
    `INSERT INTO hub.share_links (carrier_id, load_id, token, created_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [carrierId, loadId, token, createdBy]
  )
  return rows[0]
}

export async function revokeShareLink(carrierId: string, id: string): Promise<void> {
  await query(
    `UPDATE hub.share_links SET revoked_at = NOW() WHERE carrier_id = $1 AND id = $2`,
    [carrierId, id]
  )
}

export interface TrackedLoad {
  load: Pick<Load, "id" | "reference" | "status" | "equipment" | "truck_id">
  carrierName: string
  stops: Stop[]
  latestPosition: { lat: number; lng: number; ts: string } | null
}

/** Public lookup by token — exposes status + stops + city-level position only. */
export async function getTrackedLoad(token: string): Promise<TrackedLoad | null> {
  const link = await queryOne<{ load_id: string; carrier_id: string }>(
    `SELECT load_id, carrier_id FROM hub.share_links WHERE token = $1 AND revoked_at IS NULL`,
    [token]
  )
  if (!link) return null

  const load = await queryOne<Load & { carrier_name: string }>(
    `SELECT l.id, l.reference, l.status, l.equipment, l.truck_id, c.name AS carrier_name
     FROM hub.loads l JOIN hub.carriers c ON c.id = l.carrier_id
     WHERE l.id = $1 AND l.deleted_at IS NULL`,
    [link.load_id]
  )
  if (!load) return null

  const stops = await query<Stop>(
    `SELECT * FROM hub.stops WHERE load_id = $1 ORDER BY sequence`,
    [link.load_id]
  )

  let latestPosition: { lat: number; lng: number; ts: string } | null = null
  if (load.truck_id && ["dispatched", "at_pickup", "in_transit"].includes(load.status)) {
    const ping = await queryOne<{ lat: number; lng: number; ts: string }>(
      `SELECT lat, lng, ts FROM hub.position_pings WHERE truck_id = $1 ORDER BY ts DESC LIMIT 1`,
      [load.truck_id]
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

  return {
    load: { id: load.id, reference: load.reference, status: load.status, equipment: load.equipment, truck_id: load.truck_id },
    carrierName: load.carrier_name,
    stops,
    latestPosition,
  }
}
