/**
 * DAT One load board — search adapter (stub-first per docs/integrations/README.md
 * + docs/integrations/dat.md). Unlike the fuel/telematics adapters, DAT isn't a
 * background sync into an existing table: it's an interactive freight search, so
 * this slice ships the `search`/`pull` contract only. A dispatcher-facing search
 * panel and a "create load from posting" action are their own slice (see
 * creds-shopping-list.md) — building them first, before a real DAT service
 * account exists, would mean guessing both the API shape AND the UX at once.
 * `normalizeDatPosting` is the one place the assumed response shape is read;
 * swapping in the confirmed shape only touches this function.
 */
import { getCredentials, hasCredentials } from "../credentials"
import type { SyncRowBase, SyncSource } from "./registry"

export interface DatSearchCriteria {
  originCity?: string
  originState?: string
  destState?: string
  equipment?: string
  radiusMiles?: number
}

export interface DatLoadPosting extends SyncRowBase {
  postedAt: string
  equipment: string | null
  originCity: string | null
  originState: string | null
  destCity: string | null
  destState: string | null
  miles: number | null
  rateTotalCents: number | null
  pickupDate: string | null
  contactPhone: string | null
  raw: Record<string, unknown>
}

/**
 * Pure normalizer — the ONE place the assumed DAT freight-match shape is read.
 * Contract tests exercise this without ever calling the real API.
 */
export function normalizeDatPosting(record: Record<string, unknown>): DatLoadPosting {
  const rate = record.rateTotal
  return {
    external_id: String(record.matchId ?? ""),
    postedAt: String(record.postedAt ?? new Date().toISOString()),
    equipment: (record.equipmentType as string) ?? null,
    originCity: (record.originCity as string) ?? null,
    originState: (record.originState as string) ?? null,
    destCity: (record.destCity as string) ?? null,
    destState: (record.destState as string) ?? null,
    miles: typeof record.tripMiles === "number" ? record.tripMiles : null,
    rateTotalCents: typeof rate === "number" ? Math.round(rate * 100) : null,
    pickupDate: (record.pickupDate as string) ?? null,
    contactPhone: (record.contactPhone as string) ?? null,
    raw: record,
  }
}

function searchQuery(criteria: DatSearchCriteria): string {
  const params = new URLSearchParams()
  if (criteria.originCity) params.set("originCity", criteria.originCity)
  if (criteria.originState) params.set("originState", criteria.originState)
  if (criteria.destState) params.set("destState", criteria.destState)
  if (criteria.equipment) params.set("equipmentType", criteria.equipment)
  params.set("radiusMiles", String(criteria.radiusMiles ?? 100))
  return params.toString()
}

export interface DatSource extends SyncSource<DatLoadPosting> {
  /** Freight search — `pull()` is `search({})`, DAT's default radius-only query. */
  search(criteria: DatSearchCriteria): Promise<DatLoadPosting[]>
}

/** DAT One freight-matching API (developer.dat.com — service-account credentials). */
export function datSource(carrierId: string): DatSource {
  const base = process.env.DAT_API_BASE ?? "https://freight.api.dat.com/v3"

  async function search(criteria: DatSearchCriteria): Promise<DatLoadPosting[]> {
    const creds = await getCredentials(carrierId, "dat")
    if (!creds?.serviceAccountEmail || !creds?.password) throw new Error("dat is not connected")
    const auth = Buffer.from(`${creds.serviceAccountEmail}:${creds.password}`).toString("base64")
    const response = await fetch(`${base}/loads/search?${searchQuery(criteria)}`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`DAT search → HTTP ${response.status}`)
    const json = (await response.json()) as { matches?: unknown[] }
    return ((json.matches ?? []) as Record<string, unknown>[]).map(normalizeDatPosting)
  }

  return {
    provider: "dat",
    async connected() {
      return hasCredentials(carrierId, "dat")
    },
    async pull() {
      return search({})
    },
    search,
  }
}
