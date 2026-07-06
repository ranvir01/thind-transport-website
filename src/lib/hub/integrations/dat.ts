/**
 * DAT load board search (lane-integrations slice) — unlike the fuel-card
 * feeds (efs/wex/comdata), DAT isn't a background inbox to poll: a real
 * search needs an origin/destination/equipment query, and the payoff
 * action is "book a load", not "ingest a transaction". This slice ships
 * the search half of the `SyncSource<Row>` contract so the adapter is
 * useful the moment credentials land, ahead of a dedicated search UI:
 * `pull()` auto-searches DAT for postings matching the carrier's best
 * lane, using the same `hub.lanes` data `lanesOutOf()` ranks for backhaul
 * hints (src/lib/hub/lanes.ts). Deliberately does NOT ingest — postings
 * are previews, not bookings, and staging them needs a table + a "book"
 * action that lands a row in hub.loads (source='dat'); that's the next
 * slice, flagged in Backlog rather than guessed at here.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { query } from "../db"
import { dollarsToCents } from "../types"
import type { SyncRowBase, SyncSource } from "./registry"

export interface DatLoadPosting extends SyncRowBase {
  postedAt: string
  originCity: string | null
  originState: string | null
  destCity: string | null
  destState: string | null
  equipment: string | null
  miles: number | null
  rateTotalCents: number | null
  ratePerMileCents: number | null
  contactName: string | null
  contactPhone: string | null
}

/**
 * Pure normalizer — the ONE place the assumed DAT search-result shape is
 * read (DAT One Load Board API's documented match shape, best guess until
 * a sandbox account confirms it — see docs/integrations/dat.md). Swapping
 * in the confirmed shape only touches this function.
 */
export function normalizeDatPosting(record: Record<string, unknown>): DatLoadPosting {
  const origin = (record.origin ?? {}) as Record<string, unknown>
  const destination = (record.destination ?? {}) as Record<string, unknown>
  const miles = typeof record.tripMiles === "number" ? record.tripMiles : Number(record.tripMiles ?? NaN)
  const rateTotalCents = record.rateTotal != null ? dollarsToCents(record.rateTotal as number) : null

  return {
    external_id: String(record.postingId ?? ""),
    postedAt: String(record.postedDateTime ?? new Date().toISOString()),
    originCity: (origin.city as string) ?? null,
    originState: (origin.state as string) ?? null,
    destCity: (destination.city as string) ?? null,
    destState: (destination.state as string) ?? null,
    equipment: (record.equipmentType as string) ?? null,
    miles: Number.isFinite(miles) ? miles : null,
    rateTotalCents,
    ratePerMileCents:
      rateTotalCents != null && Number.isFinite(miles) && miles > 0
        ? Math.round(rateTotalCents / miles)
        : null,
    contactName: (record.contactName as string) ?? null,
    contactPhone: (record.contactPhone as string) ?? null,
  }
}

/**
 * DAT search client (docs/integrations/dat.md — shape unconfirmed until a
 * sandbox account exists). Without a search UI yet, `pull()` searches the
 * carrier's top lane by margin — the same ranking `lanesOutOf()` uses for
 * backhaul hints — so "sync now" surfaces something useful immediately;
 * an explicit "search this lane" action is the follow-up slice.
 */
export function datSource(carrierId: string): SyncSource<DatLoadPosting> {
  const base = process.env.DAT_API_BASE ?? "https://identity.dat.com/api/v3"

  return {
    provider: "dat",
    async connected() {
      return hasCredentials(carrierId, "dat")
    },
    async pull() {
      const creds = await getCredentials(carrierId, "dat")
      if (!creds?.serviceAccountEmail || !creds?.password) throw new Error("dat is not connected")

      const [topLane] = await query<{
        origin_city: string; origin_state: string; dest_city: string; dest_state: string
      }>(
        `SELECT origin_city, origin_state, dest_city, dest_state FROM hub.lanes
         WHERE carrier_id = $1 ORDER BY margin_cents DESC, loads_count DESC LIMIT 1`,
        [carrierId]
      )
      if (!topLane) return []

      const auth = Buffer.from(`${creds.serviceAccountEmail}:${creds.password}`).toString("base64")
      const params = new URLSearchParams({
        originCity: topLane.origin_city, originState: topLane.origin_state,
        destCity: topLane.dest_city, destState: topLane.dest_state,
      })
      const response = await fetch(`${base}/loads/search?${params.toString()}`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error(`DAT search → HTTP ${response.status}`)
      const json = (await response.json()) as { matches?: unknown[] }
      return ((json.matches ?? []) as Record<string, unknown>[]).map(normalizeDatPosting)
    },
  }
}
