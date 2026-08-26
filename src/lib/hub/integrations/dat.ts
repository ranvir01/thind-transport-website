/**
 * DAT One load board — search adapter (stub-first per docs/integrations/README.md
 * + docs/integrations/dat.md). Unlike the fuel/telematics adapters, DAT isn't a
 * background sync into an existing table: it's an interactive freight search, so
 * this slice ships the `search`/`pull` contract plus `datPostingToLoadDraft`, which
 * maps a matched posting onto `createLoad()`'s input shape. A dispatcher-facing
 * search panel and "book this posting" button are their own slice (see
 * creds-shopping-list.md) — building them first, before a real DAT service
 * account exists, would mean guessing both the API shape AND the UX at once; this
 * slice gives that future UI a finished, tested mapper to call instead.
 * `normalizeDatPosting` is the one place the assumed response shape is read;
 * swapping in the confirmed shape only touches this function.
 */
import { getCredentials, hasCredentials } from "../credentials"
import type { LoadInput, StopInput } from "../loads"
import { dollarsToCents, type EquipmentType } from "../types"
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
    rateTotalCents: typeof rate === "number" && Number.isFinite(rate) ? dollarsToCents(rate) : null,
    pickupDate: (record.pickupDate as string) ?? null,
    contactPhone: (record.contactPhone as string) ?? null,
    raw: record,
  }
}

/** The one field `createLoad()` needs that no DAT posting can supply — a dispatcher picks it. */
export type DatLoadDraft = Omit<LoadInput, "customer_id" | "status">

const EQUIPMENT_PATTERNS: [EquipmentType, RegExp][] = [
  ["reefer", /reefer|refr|^r$/i],
  ["flatbed", /flat|^f(bed)?$/i],
  ["dry_van", /van|^v$/i],
]

function mapEquipment(raw: string | null): EquipmentType {
  if (raw) {
    for (const [type, pattern] of EQUIPMENT_PATTERNS) {
      if (pattern.test(raw)) return type
    }
  }
  return "dry_van"
}

/**
 * Prefill a load-creation draft from a DAT posting — the one place a posting is turned
 * into `LoadInput`-shaped fields. `customer_id` is deliberately omitted: DAT has no concept
 * of our customer records, so a dispatcher must still pick or create one before `createLoad()`
 * accepts the draft. Everything else (stops, rate, miles, equipment) is ready to submit as-is.
 */
export function datPostingToLoadDraft(posting: DatLoadPosting): DatLoadDraft {
  const stops: StopInput[] = [
    { type: "pickup", city: posting.originCity ?? "", state: posting.originState ?? "", appt_start: posting.pickupDate },
    { type: "delivery", city: posting.destCity ?? "", state: posting.destState ?? "" },
  ]
  return {
    customer_reference: posting.external_id,
    equipment: mapEquipment(posting.equipment),
    commodity: null,
    linehaul_cents: posting.rateTotalCents ?? 0,
    fuel_surcharge_cents: 0,
    accessorials: [],
    loaded_miles: posting.miles,
    source: "dat",
    notes: posting.contactPhone ? `DAT posting contact: ${posting.contactPhone}` : null,
    stops,
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
    // DAT's RESTful API FAQ (one.support.dat.com) confirms a two-level model: the service
    // account authenticates the organization, but every request is made AS a regular user who
    // must hold a Connexion + load board seat — the service account alone cannot search or post.
    // actingUserEmail is required here so the credential is on file before the real token
    // exchange is built; the request below still sends organization Basic auth only (placeholder,
    // see docs/integrations/dat.md) until DAT's developer packet confirms the token endpoints.
    if (!creds?.serviceAccountEmail || !creds?.password || !creds?.actingUserEmail) {
      throw new Error("dat is not connected")
    }
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
