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

interface DatCredentials {
  serviceAccountEmail: string
  password: string
  actingUserEmail: string
}

interface DatTokenResponse {
  accessToken?: string
}

const DAT_CREDENTIAL_LABELS: [keyof DatCredentials, string][] = [
  ["serviceAccountEmail", "service account email"],
  ["password", "password"],
  ["actingUserEmail", "acting user email"],
]

function assertDatCredentials(
  creds: Partial<DatCredentials> | null | undefined
): asserts creds is DatCredentials {
  const missing = DAT_CREDENTIAL_LABELS.filter(([key]) => !creds?.[key]).map(([, label]) => label)
  if (missing.length > 0) {
    throw new Error(`dat is not connected (missing ${missing.join(", ")})`)
  }
}

function datFreightBase(): string {
  return (process.env.DAT_API_BASE ?? "https://freight.api.dat.com/v3").replace(/\/$/, "")
}

/** Identity host follows freight staging when `DAT_API_BASE` points at staging. */
function datIdentityBase(): string {
  const override = process.env.DAT_IDENTITY_API_BASE
  if (override) return override.replace(/\/$/, "")
  if (datFreightBase().includes(".staging.")) return "https://identity.api.staging.dat.com"
  return "https://identity.api.dat.com"
}

async function fetchDatUserToken(creds: DatCredentials): Promise<string> {
  const identityBase = datIdentityBase()
  const orgResponse = await fetch(`${identityBase}/access/v1/token/organization`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username: creds.serviceAccountEmail, password: creds.password }),
    signal: AbortSignal.timeout(15000),
  })
  if (!orgResponse.ok) throw new Error(`DAT org token → HTTP ${orgResponse.status}`)
  const orgJson = (await orgResponse.json()) as DatTokenResponse
  if (!orgJson.accessToken) throw new Error("DAT org token response missing accessToken")

  const userResponse = await fetch(`${identityBase}/access/v1/token/user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${orgJson.accessToken}`,
    },
    body: JSON.stringify({ username: creds.actingUserEmail }),
    signal: AbortSignal.timeout(15000),
  })
  if (!userResponse.ok) throw new Error(`DAT user token → HTTP ${userResponse.status}`)
  const userJson = (await userResponse.json()) as DatTokenResponse
  if (!userJson.accessToken) throw new Error("DAT user token response missing accessToken")
  return userJson.accessToken
}

export interface DatSource extends SyncSource<DatLoadPosting> {
  /** Freight search — `pull()` is `search({})`, DAT's default radius-only query. */
  search(criteria: DatSearchCriteria): Promise<DatLoadPosting[]>
}

/** DAT One freight-matching API (developer.dat.com — service-account credentials). */
export function datSource(carrierId: string): DatSource {
  async function search(criteria: DatSearchCriteria): Promise<DatLoadPosting[]> {
    const creds = await getCredentials(carrierId, "dat")
    // Two-level auth per DAT's RESTful API FAQ: service account → org token, acting user →
    // user token, then Bearer on freight calls. Token paths modeled from public identity API
    // docs (see docs/integrations/dat.md); re-auth each search — tokens expire ~30 min.
    assertDatCredentials(creds)
    const bearer = await fetchDatUserToken(creds)
    const response = await fetch(`${datFreightBase()}/loads/search?${searchQuery(criteria)}`, {
      headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json" },
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
