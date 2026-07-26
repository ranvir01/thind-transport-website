/**
 * Truckstop.com load board — search adapter (stub-first per docs/integrations/README.md
 * + docs/integrations/truckstop.md). Same shape as `dat.ts`: this is an interactive
 * freight search, not a background sync into an existing table, so this slice ships
 * the `search`/`pull` contract, its normalizer, and `truckstopPostingToLoadDraft`,
 * which maps a matched posting onto `createLoad()`'s input shape. The dispatcher-facing
 * search panel lives in `TruckstopFreightSearch` on `/hub/loadboard`.
 *
 * Transport: the confirmed Load Search web service is SOAP 1.1 / XML with
 * IntegrationId/UserName/Password inside the envelope body (see
 * docs/integrations/truckstop.md) — not the Bearer-key REST/JSON this file
 * assumed before the 2026-07-18 scout pass. `parseLoadSearchResponse` and
 * `normalizeTruckstopPosting` are the two places the assumed XML element
 * names are read; the real `GetLoadSearchResults` schema sits behind the
 * developer portal's bot wall, so both stay adjustable in one place until a
 * developer packet confirms the wire names.
 */
import { getCredentials, hasCredentials } from "../credentials"
import type { LoadInput, StopInput } from "../loads"
import { roundHalfAwayFromZero } from "../rounding"
import type { EquipmentType } from "../types"
import type { SyncRowBase, SyncSource } from "./registry"

const SOAP_ACTION = "http://webservices.truckstop.com/v12/ILoadSearch/GetLoadSearchResults"
const SOAP_NS = "http://webservices.truckstop.com/v12"

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

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(n) ? n : null
}

/**
 * Pure normalizer — the ONE place the assumed `GetLoadSearchResults` XML element
 * names are read (PascalCase, matching the vendor's other confirmed field names —
 * see docs/integrations/truckstop.md). Contract tests exercise this without ever
 * calling the real API. `record` comes from `parseLoadSearchResponse`, so its keys
 * are strings even for numeric-looking fields (raw XML text content).
 */
export function normalizeTruckstopPosting(record: Record<string, unknown>): TruckstopLoadPosting {
  return {
    external_id: String(record.LoadId ?? ""),
    postedAt: String(record.PostedDate ?? new Date().toISOString()),
    equipment: (record.Equipment as string) ?? null,
    originCity: (record.OriginCity as string) ?? null,
    originState: (record.OriginState as string) ?? null,
    destCity: (record.DestinationCity as string) ?? null,
    destState: (record.DestinationState as string) ?? null,
    miles: toNumber(record.TripMiles),
    rateTotalCents: (() => {
      const rate = toNumber(record.TotalRate)
      return rate === null ? null : roundHalfAwayFromZero(rate * 100)
    })(),
    pickupDate: (record.PickupDate as string) ?? null,
    contactPhone: (record.ContactPhone as string) ?? null,
    raw: record,
  }
}

/** The one field `createLoad()` needs that no Truckstop posting can supply — a dispatcher picks it. */
export type TruckstopLoadDraft = Omit<LoadInput, "customer_id" | "status">

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
 * Prefill a load-creation draft from a Truckstop posting — the one place a posting is turned
 * into `LoadInput`-shaped fields. `customer_id` is deliberately omitted: Truckstop has no concept
 * of our customer records, so a dispatcher must still pick or create one before `createLoad()`
 * accepts the draft. Everything else (stops, rate, miles, equipment) is ready to submit as-is.
 */
export function truckstopPostingToLoadDraft(posting: TruckstopLoadPosting): TruckstopLoadDraft {
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
    source: "truckstop",
    notes: posting.contactPhone ? `Truckstop posting contact: ${posting.contactPhone}` : null,
    stops,
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

/** Every match of `<tag>...</tag>` (namespace-prefix tolerant), in document order. */
function extractTagBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "gi")
  const blocks: string[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(xml))) blocks.push(match[1])
  return blocks
}

function extractTagValue(xml: string, tag: string): string | null {
  const [first] = extractTagBlocks(xml, tag)
  return first === undefined ? null : decodeXmlEntities(first.trim())
}

/**
 * Build the `GetLoadSearchResults` SOAP request body. Only `OriginStates`/
 * `DestinationStates`/`HoursOld` are confirmed request fields (see
 * docs/integrations/truckstop.md) — city-level and radius filtering aren't
 * part of the confirmed shape, so `originCity`/`radiusMiles` aren't sent
 * until a developer packet confirms whether/how the service accepts them.
 */
function buildSearchEnvelope(
  criteria: TruckstopSearchCriteria,
  creds: { integrationId: string; username: string; password: string }
): string {
  const body: string[] = [
    `<IntegrationId>${escapeXml(creds.integrationId)}</IntegrationId>`,
    `<UserName>${escapeXml(creds.username)}</UserName>`,
    `<Password>${escapeXml(creds.password)}</Password>`,
  ]
  if (criteria.originState) {
    body.push(`<OriginStates><string>${escapeXml(criteria.originState)}</string></OriginStates>`)
  }
  if (criteria.destState) {
    body.push(`<DestinationStates><string>${escapeXml(criteria.destState)}</string></DestinationStates>`)
  }
  if (criteria.equipment) body.push(`<Equipment>${escapeXml(criteria.equipment)}</Equipment>`)
  body.push(`<HoursOld>0</HoursOld>`)
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Body><GetLoadSearchResults xmlns="${SOAP_NS}">${body.join("")}</GetLoadSearchResults></soap:Body>` +
    `</soap:Envelope>`
  )
}

/**
 * Per-posting wrapper tag name is unconfirmed between `LoadSearchResult` (the
 * original assumption) and `LoadSearchItem` (2026-07-25 Partner-API scout
 * pass — consistent search-snippet evidence, not primary-source confirmed;
 * see docs/integrations/truckstop.md). Try the original assumption first,
 * then the scout's lead, so a real response can't silently parse to zero
 * postings no matter which name turns out to be right — the same tolerant-
 * match approach `fuel-feed-csv.ts` uses for unconfirmed CSV headers.
 */
const LOAD_ITEM_TAGS = ["LoadSearchResult", "LoadSearchItem"] as const

/**
 * Parse a `GetLoadSearchResultsResponse` SOAP body into plain records keyed by
 * the assumed `LoadSearchResult`/`LoadSearchItem` element names (see
 * `normalizeTruckstopPosting`). A `<faultstring>` anywhere in the response —
 * SOAP 1.1's fault shape — throws instead of silently returning zero postings.
 */
export function parseLoadSearchResponse(xml: string): Record<string, unknown>[] {
  const fault = extractTagValue(xml, "faultstring")
  if (fault) throw new Error(`Truckstop SOAP fault: ${fault}`)
  const fields = [
    "LoadId",
    "PostedDate",
    "Equipment",
    "OriginCity",
    "OriginState",
    "DestinationCity",
    "DestinationState",
    "TripMiles",
    "TotalRate",
    "PickupDate",
    "ContactPhone",
  ] as const
  let blocks: string[] = []
  for (const tag of LOAD_ITEM_TAGS) {
    blocks = extractTagBlocks(xml, tag)
    if (blocks.length > 0) break
  }
  return blocks.map((block) => {
    const record: Record<string, unknown> = {}
    for (const field of fields) record[field] = extractTagValue(block, field)
    return record
  })
}

export interface TruckstopSource extends SyncSource<TruckstopLoadPosting> {
  /** Freight search — `pull()` is `search({})`, Truckstop's default unfiltered query. */
  search(criteria: TruckstopSearchCriteria): Promise<TruckstopLoadPosting[]>
}

/**
 * Truckstop.com Load Search web service — SOAP 1.1/XML, not REST (confirmed
 * 2026-07-18, see docs/integrations/truckstop.md). Base defaults to the
 * confirmed sandbox host; the production host follows the same
 * `webservices.truckstop.com` namespace the SOAPAction uses but isn't
 * confirmed yet, so override with `TRUCKSTOP_API_BASE` once a developer
 * packet names it.
 */
export function truckstopSource(carrierId: string): TruckstopSource {
  const base = process.env.TRUCKSTOP_API_BASE ?? "https://testws.truckstop.com"

  async function search(criteria: TruckstopSearchCriteria): Promise<TruckstopLoadPosting[]> {
    const creds = await getCredentials(carrierId, "truckstop")
    if (!creds?.integrationId || !creds?.username || !creds?.password) {
      throw new Error("truckstop is not connected")
    }
    const envelope = buildSearchEnvelope(criteria, {
      integrationId: creds.integrationId,
      username: creds.username,
      password: creds.password,
    })
    const response = await fetch(`${base}/v13/Searching/LoadSearch.svc`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: SOAP_ACTION,
      },
      body: envelope,
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`Truckstop search → HTTP ${response.status}`)
    const xml = await response.text()
    return parseLoadSearchResponse(xml).map(normalizeTruckstopPosting)
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
