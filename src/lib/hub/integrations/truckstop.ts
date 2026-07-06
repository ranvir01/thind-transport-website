/**
 * Truckstop.com load board — search adapter (stub-first per docs/integrations/README.md
 * + docs/integrations/truckstop.md). Same shape as `dat.ts`: this is an interactive
 * freight search, not a background sync into an existing table, so this slice ships
 * the `search`/`pull` contract and its normalizer only. It deliberately stops short of
 * a `truckstopPostingToLoadDraft` mapper — `hub.loads.source` is a DB CHECK constraint
 * (`migrations/hub/002_tenancy_money_events.sql`) currently limited to
 * `'dat','direct','import','quote'`, a shared migration file outside this lane's
 * territory (see Backlog). Once that constraint grows a `'truckstop'` value, the
 * mapper is a copy of `datPostingToLoadDraft` with the source string swapped.
 * `normalizeTruckstopPosting` is the one place the assumed response shape is read.
 */
import { getCredentials, hasCredentials } from "../credentials"
import type { SyncRowBase, SyncSource } from "./registry"

export interface TruckstopSearchCriteria {
  originCity?: string
  originState?: string
  destState?: string
  equipment?: string
  radiusMiles?: number
}

export interface TruckstopLoadPosting extends SyncRowBase {
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
 * Pure normalizer — the ONE place the assumed Truckstop.com posting shape is read.
 * Contract tests exercise this without ever calling the real API.
 */
export function normalizeTruckstopPosting(record: Record<string, unknown>): TruckstopLoadPosting {
  const rate = record.totalRate
  return {
    external_id: String(record.postingId ?? ""),
    postedAt: String(record.postedDate ?? new Date().toISOString()),
    equipment: (record.equipment as string) ?? null,
    originCity: (record.originCity as string) ?? null,
    originState: (record.originState as string) ?? null,
    destCity: (record.destCity as string) ?? null,
    destState: (record.destState as string) ?? null,
    miles: typeof record.miles === "number" ? record.miles : null,
    rateTotalCents: typeof rate === "number" ? Math.round(rate * 100) : null,
    pickupDate: (record.pickupDate as string) ?? null,
    contactPhone: (record.contactPhone as string) ?? null,
    raw: record,
  }
}

function searchQuery(criteria: TruckstopSearchCriteria): string {
  const params = new URLSearchParams()
  if (criteria.originCity) params.set("originCity", criteria.originCity)
  if (criteria.originState) params.set("originState", criteria.originState)
  if (criteria.destState) params.set("destState", criteria.destState)
  if (criteria.equipment) params.set("equipment", criteria.equipment)
  params.set("radiusMiles", String(criteria.radiusMiles ?? 100))
  return params.toString()
}

export interface TruckstopSource extends SyncSource<TruckstopLoadPosting> {
  /** Freight search — `pull()` is `search({})`, Truckstop's default radius-only query. */
  search(criteria: TruckstopSearchCriteria): Promise<TruckstopLoadPosting[]>
}

/** Truckstop.com load board API (developer portal — single API key). */
export function truckstopSource(carrierId: string): TruckstopSource {
  const base = process.env.TRUCKSTOP_API_BASE ?? "https://api.truckstop.com/v1"

  async function search(criteria: TruckstopSearchCriteria): Promise<TruckstopLoadPosting[]> {
    const creds = await getCredentials(carrierId, "truckstop")
    if (!creds?.apiKey) throw new Error("truckstop is not connected")
    const response = await fetch(`${base}/loads/search?${searchQuery(criteria)}`, {
      headers: { Authorization: `Bearer ${creds.apiKey}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`Truckstop search → HTTP ${response.status}`)
    const json = (await response.json()) as { postings?: unknown[] }
    return ((json.postings ?? []) as Record<string, unknown>[]).map(normalizeTruckstopPosting)
  }

  return {
    provider: "truckstop",
    async connected() {
      return hasCredentials(carrierId, "truckstop")
    },
    async pull() {
      return search({})
    },
    search,
  }
}
