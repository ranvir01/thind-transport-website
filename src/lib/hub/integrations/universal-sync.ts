/**
 * Sync clients for the universal-coverage providers (AtoB, Plaid, Bestpass,
 * PrePass, Fleetio, SambaSafety) — the same stub-first discipline efs.ts
 * pioneered: each provider is a `SyncSource` whose HTTP call is isolated
 * from a pure `normalize*` function, every landing goes through an
 * idempotent key, and until credentials are pasted `connected()` is false
 * and the CSV/manual fallback remains the product.
 *
 * Response shapes are the DOCUMENTED-ASSUMPTION kind, exactly like EFS
 * before its rep replied: each normalizer is the one place the assumption
 * lives, so confirming a real payload against the sandbox touches one
 * function per provider and nothing else. Base URLs are env-overridable for
 * the same reason (`ATOB_API_BASE`, `PLAID_API_BASE`, …).
 *
 * Landing paths — no new tables, no new read paths:
 *   AtoB      → hub.fuel_transactions   (source 'atob', same key as EFS/WEX)
 *   Plaid     → hub.fuel_transactions   (source 'plaid', gallons 0 — bank
 *               rows carry spend, not pump data; MPG/IFTA sum gallons so a
 *               zero-gallon row adds spend visibility without touching them)
 *   Bestpass  → hub.toll_transactions   (source 'bestpass')
 *   PrePass   → hub.toll_transactions   (source 'prepass')
 *   Fleetio   → hub.maintenance_records (deduped via the integration_events
 *               ledger — the table itself has no natural key)
 *   SambaSafety → notifications to owner/safety, deduped the same way (an
 *               MVR alert is a "call the driver today" fact, not a table)
 *
 * Axle (the third ELD aggregator) is NOT here — it is a TelematicsSource in
 * telematics.ts beside Terminal and TruckerCloud, because that is the seam
 * every HOS/position reader already consumes.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { query } from "../db"
import { notifyRoles } from "../notify"
import { normalizeState } from "../csv"
import { dollarsToCents } from "../types"
import { fetchWithRetry } from "./http-retry"
import type { SyncRowBase, SyncSource } from "./registry"

export interface UniversalSyncResult {
  connected: boolean
  imported?: number
  skipped?: number
  unmatched?: string[]
  summary?: string
}

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

async function truckIdByUnit(carrierId: string): Promise<Map<string, string>> {
  const trucks = await query<{ id: string; unit_number: string }>(
    `SELECT id, unit_number FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL`,
    [carrierId]
  )
  return new Map(trucks.map((t) => [t.unit_number.toLowerCase(), t.id]))
}

/**
 * Claim an external id in the integration_events ledger. Returns true only
 * the FIRST time — the (carrier_id, provider, external_id) unique key makes
 * this the poll-side twin of the webhook receiver's replay dedup, for
 * providers whose landing target has no natural idempotency key of its own.
 */
async function claimEvent(
  carrierId: string,
  provider: string,
  externalId: string,
  kind: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `INSERT INTO hub.integration_events (carrier_id, provider, external_id, kind, payload, processed_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (carrier_id, provider, external_id) DO NOTHING RETURNING id`,
    [carrierId, provider, externalId, kind, JSON.stringify(payload)]
  )
  return rows.length > 0
}

async function pullJson(
  url: string,
  headers: Record<string, string>,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const response = await fetchWithRetry(url, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`${new URL(url).hostname} → HTTP ${response.status}`)
  return (await response.json()) as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Fuel-side rows (AtoB, Plaid) — land beside EFS/WEX/Comdata
// ---------------------------------------------------------------------------

export interface UniversalFuelRow extends SyncRowBase {
  ts: string
  unitHint: string | null
  merchant: string | null
  city: string | null
  jurisdiction: string | null
  gallons: number
  unitPriceCents: number | null
  totalCents: number
  raw: Record<string, unknown>
}

/** AtoB transaction (assumed shape, documented here until sandbox confirms). */
export function normalizeAtobRecord(record: Record<string, unknown>): UniversalFuelRow {
  const gallons = Number(record.quantity ?? record.gallons ?? 0) || 0
  return {
    external_id: String(record.id ?? record.transaction_id ?? ""),
    ts: String(record.transacted_at ?? record.created_at ?? new Date().toISOString()),
    unitHint: (record.vehicle_name as string) ?? (record.unit as string) ?? null,
    merchant: (record.merchant_name as string) ?? null,
    city: (record.merchant_city as string) ?? null,
    jurisdiction: record.merchant_state ? normalizeState(String(record.merchant_state)) : null,
    gallons,
    unitPriceCents:
      record.price_per_gallon != null ? dollarsToCents(Number(record.price_per_gallon)) : null,
    totalCents: dollarsToCents(Number(record.amount ?? 0)),
    raw: record,
  }
}

/**
 * Plaid transaction → fuel-spend row. Only rows whose merchant/category
 * reads as fuel are kept — the bank feed carries the whole account, and
 * lunch is not diesel. Gallons stay 0: spend visibility, not pump data.
 */
const FUEL_MERCHANT = /fuel|diesel|truck ?stop|petro|pilot|flying ?j|love'?s|ta ?express|travel ?center|casey|maverik|speedway|circle ?k|shell|chevron|exxon|mobil|76|arco|sinclair|conoco|phillips ?66/i

export function normalizePlaidRecord(record: Record<string, unknown>): UniversalFuelRow | null {
  const name = String(record.merchant_name ?? record.name ?? "")
  const categories = Array.isArray(record.category) ? record.category.join(" ") : String(record.personal_finance_category ?? "")
  if (!FUEL_MERCHANT.test(name) && !/gas.?station|fuel/i.test(categories)) return null
  const amount = Number(record.amount ?? 0)
  if (!(amount > 0)) return null // Plaid: positive = money out; refunds skipped
  const location = (record.location ?? {}) as Record<string, unknown>
  return {
    external_id: String(record.transaction_id ?? ""),
    ts: String(record.datetime ?? record.date ?? new Date().toISOString()),
    unitHint: null, // a bank row cannot know the truck
    merchant: name || null,
    city: (location.city as string) ?? null,
    jurisdiction: location.region ? normalizeState(String(location.region)) : null,
    gallons: 0,
    unitPriceCents: null,
    totalCents: dollarsToCents(amount),
    raw: record,
  }
}

async function ingestFuelRows(
  carrierId: string,
  source: "atob" | "plaid",
  cardProgram: string,
  rows: UniversalFuelRow[]
): Promise<{ imported: number; skipped: number; unmatched: string[] }> {
  const byUnit = await truckIdByUnit(carrierId)
  const unmatched: string[] = []
  let imported = 0
  let skipped = 0
  for (const row of rows) {
    if (!row.external_id) continue // empty ids would collide on the idempotency key
    const truckId = row.unitHint ? byUnit.get(row.unitHint.toLowerCase()) ?? null : null
    if (row.unitHint && !truckId) unmatched.push(row.unitHint)
    const result = await query<{ id: string }>(
      `INSERT INTO hub.fuel_transactions
         (carrier_id, source, external_id, card_program, truck_id, ts, merchant, city,
          jurisdiction, gallons, unit_price_cents, total_cents, odometer, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL,$13)
       ON CONFLICT (carrier_id, source, external_id) DO NOTHING RETURNING id`,
      [
        carrierId, source, row.external_id, cardProgram, truckId, row.ts, row.merchant, row.city,
        row.jurisdiction, row.gallons, row.unitPriceCents, row.totalCents, JSON.stringify(row.raw),
      ]
    )
    if (result.length > 0) imported++
    else skipped++
  }
  return { imported, skipped, unmatched }
}

export function atobSource(carrierId: string): SyncSource<UniversalFuelRow> {
  const base = process.env.ATOB_API_BASE ?? "https://api.atob.com/v1"
  return {
    provider: "atob",
    connected: () => hasCredentials(carrierId, "atob"),
    async pull() {
      const creds = await getCredentials(carrierId, "atob")
      if (!creds?.apiKey) throw new Error("atob is not connected")
      const json = await pullJson(`${base}/transactions`, { Authorization: `Bearer ${creds.apiKey}` })
      return ((json.transactions ?? json.data ?? []) as Record<string, unknown>[]).map(normalizeAtobRecord)
    },
  }
}

export function plaidSource(carrierId: string): SyncSource<UniversalFuelRow> {
  const base = process.env.PLAID_API_BASE ?? "https://production.plaid.com"
  return {
    provider: "plaid",
    connected: () => hasCredentials(carrierId, "plaid"),
    async pull() {
      const creds = await getCredentials(carrierId, "plaid")
      if (!creds?.clientId || !creds?.secret || !creds?.accessToken) throw new Error("plaid is not connected")
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
      const today = new Date().toISOString().slice(0, 10)
      const json = await pullJson(`${base}/transactions/get`, { "Content-Type": "application/json" }, {
        method: "POST",
        body: JSON.stringify({
          client_id: creds.clientId,
          secret: creds.secret,
          access_token: creds.accessToken,
          start_date: since,
          end_date: today,
          options: { count: 500 },
        }),
      })
      return ((json.transactions ?? []) as Record<string, unknown>[])
        .map(normalizePlaidRecord)
        .filter((r): r is UniversalFuelRow => r !== null)
    },
  }
}

// ---------------------------------------------------------------------------
// Toll rows (Bestpass, PrePass) — land beside the toll CSV import
// ---------------------------------------------------------------------------

export interface UniversalTollRow extends SyncRowBase {
  ts: string
  unitHint: string | null
  transponder: string | null
  plaza: string | null
  jurisdiction: string | null
  amountCents: number
  raw: Record<string, unknown>
}

export function normalizeTollRecord(record: Record<string, unknown>): UniversalTollRow {
  return {
    external_id: String(record.id ?? record.transaction_id ?? ""),
    ts: String(record.transaction_date ?? record.occurred_at ?? new Date().toISOString()),
    unitHint: (record.vehicle as string) ?? (record.unit_number as string) ?? null,
    transponder: (record.transponder as string) ?? (record.tag_id as string) ?? null,
    plaza: (record.plaza as string) ?? (record.facility as string) ?? null,
    jurisdiction: record.state ? normalizeState(String(record.state)) : null,
    amountCents: dollarsToCents(Number(record.amount ?? 0)),
    raw: record,
  }
}

async function ingestTollRows(
  carrierId: string,
  source: "bestpass" | "prepass",
  rows: UniversalTollRow[]
): Promise<{ imported: number; skipped: number; unmatched: string[] }> {
  const byUnit = await truckIdByUnit(carrierId)
  const unmatched: string[] = []
  let imported = 0
  let skipped = 0
  for (const row of rows) {
    if (!row.external_id) continue
    const truckId = row.unitHint ? byUnit.get(row.unitHint.toLowerCase()) ?? null : null
    if (row.unitHint && !truckId) unmatched.push(row.unitHint)
    const result = await query<{ id: string }>(
      `INSERT INTO hub.toll_transactions
         (carrier_id, source, external_id, transponder, truck_id, ts, plaza, jurisdiction, amount_cents, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (carrier_id, source, external_id) DO NOTHING RETURNING id`,
      [
        carrierId, source, row.external_id, row.transponder, truckId, row.ts, row.plaza,
        row.jurisdiction, row.amountCents, JSON.stringify(row.raw),
      ]
    )
    if (result.length > 0) imported++
    else skipped++
  }
  return { imported, skipped, unmatched }
}

function tollSource(
  provider: "bestpass" | "prepass",
  carrierId: string,
  base: string,
  authHeaders: (creds: Record<string, string>) => Record<string, string> | null
): SyncSource<UniversalTollRow> {
  return {
    provider,
    connected: () => hasCredentials(carrierId, provider),
    async pull() {
      const creds = await getCredentials(carrierId, provider)
      const headers = creds ? authHeaders(creds) : null
      if (!headers) throw new Error(`${provider} is not connected`)
      const json = await pullJson(`${base}/toll-transactions`, headers)
      return ((json.transactions ?? json.data ?? []) as Record<string, unknown>[]).map(normalizeTollRecord)
    },
  }
}

export const bestpassSource = (carrierId: string) =>
  tollSource("bestpass", carrierId, process.env.BESTPASS_API_BASE ?? "https://api.bestpass.com/v1", (c) =>
    c.clientId && c.clientSecret
      ? { Authorization: `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}` }
      : null
  )

export const prepassSource = (carrierId: string) =>
  tollSource("prepass", carrierId, process.env.PREPASS_API_BASE ?? "https://api.prepass.com/v1", (c) =>
    c.apiKey ? { Authorization: `Bearer ${c.apiKey}` } : null
  )

// ---------------------------------------------------------------------------
// Fleetio — completed service entries → hub.maintenance_records
// ---------------------------------------------------------------------------

export interface FleetioServiceRow extends SyncRowBase {
  unitHint: string | null
  doneOn: string
  vendor: string | null
  costCents: number
  notes: string | null
  raw: Record<string, unknown>
}

export function normalizeFleetioRecord(record: Record<string, unknown>): FleetioServiceRow {
  const vehicle = (record.vehicle ?? {}) as Record<string, unknown>
  return {
    external_id: String(record.id ?? ""),
    unitHint: (vehicle.name as string) ?? (record.vehicle_name as string) ?? null,
    doneOn: String(record.completed_at ?? record.date ?? "").slice(0, 10),
    vendor: (record.vendor_name as string) ?? null,
    costCents: dollarsToCents(Number(record.total_amount ?? 0)),
    notes: (record.description as string) ?? (record.name as string) ?? null,
    raw: record,
  }
}

export function fleetioSource(carrierId: string): SyncSource<FleetioServiceRow> {
  const base = process.env.FLEETIO_API_BASE ?? "https://secure.fleetio.com/api/v1"
  return {
    provider: "fleetio",
    connected: () => hasCredentials(carrierId, "fleetio"),
    async pull() {
      const creds = await getCredentials(carrierId, "fleetio")
      if (!creds?.apiToken || !creds?.accountToken) throw new Error("fleetio is not connected")
      // Fleetio rate limit is 20 req/min (registry blurb) — one request/run.
      const json = await pullJson(`${base}/service_entries`, {
        Authorization: `Token ${creds.apiToken}`,
        "Account-Token": creds.accountToken,
      })
      const list = Array.isArray(json) ? (json as Record<string, unknown>[]) : ((json.records ?? []) as Record<string, unknown>[])
      return list.map(normalizeFleetioRecord)
    },
  }
}

async function ingestFleetioRows(
  carrierId: string,
  rows: FleetioServiceRow[]
): Promise<{ imported: number; skipped: number; unmatched: string[] }> {
  const byUnit = await truckIdByUnit(carrierId)
  const unmatched: string[] = []
  let imported = 0
  let skipped = 0
  for (const row of rows) {
    if (!row.external_id || !row.doneOn) continue
    const truckId = row.unitHint ? byUnit.get(row.unitHint.toLowerCase()) : undefined
    if (!truckId) {
      // maintenance_records.truck_id is NOT NULL — an unmatched vehicle
      // cannot land, so it is reported instead of guessed.
      if (row.unitHint) unmatched.push(row.unitHint)
      continue
    }
    // The ledger is the idempotency key: maintenance_records has none.
    const fresh = await claimEvent(carrierId, "fleetio", row.external_id, "service_entry", row.raw)
    if (!fresh) {
      skipped++
      continue
    }
    await query(
      `INSERT INTO hub.maintenance_records (carrier_id, truck_id, done_on, vendor, cost_cents, notes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [carrierId, truckId, row.doneOn, row.vendor, row.costCents, row.notes]
    )
    imported++
  }
  return { imported, skipped, unmatched }
}

// ---------------------------------------------------------------------------
// SambaSafety — MVR alerts → notifications (owner + dispatch)
// ---------------------------------------------------------------------------

export interface MvrAlertRow extends SyncRowBase {
  driverNameHint: string | null
  headline: string
  raw: Record<string, unknown>
}

export function normalizeSambaRecord(record: Record<string, unknown>): MvrAlertRow {
  const driver = (record.driver ?? {}) as Record<string, unknown>
  const name =
    (driver.full_name as string) ??
    [driver.first_name, driver.last_name].filter(Boolean).join(" ") ??
    null
  return {
    external_id: String(record.id ?? record.alert_id ?? ""),
    driverNameHint: name || null,
    headline: String(record.description ?? record.type ?? "License status change"),
    raw: record,
  }
}

export function sambasafetySource(carrierId: string): SyncSource<MvrAlertRow> {
  const base = process.env.SAMBASAFETY_API_BASE ?? "https://api.sambasafety.com/v1"
  return {
    provider: "sambasafety",
    connected: () => hasCredentials(carrierId, "sambasafety"),
    async pull() {
      const creds = await getCredentials(carrierId, "sambasafety")
      if (!creds?.clientId || !creds?.clientSecret) throw new Error("sambasafety is not connected")
      const json = await pullJson(`${base}/alerts`, {
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
      })
      return ((json.alerts ?? json.data ?? []) as Record<string, unknown>[]).map(normalizeSambaRecord)
    },
  }
}

async function ingestMvrAlerts(
  carrierId: string,
  rows: MvrAlertRow[]
): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0
  for (const row of rows) {
    if (!row.external_id) continue
    const fresh = await claimEvent(carrierId, "sambasafety", row.external_id, "mvr_alert", row.raw)
    if (!fresh) {
      skipped++
      continue
    }
    await notifyRoles(carrierId, ["owner", "dispatcher"], {
      kind: "compliance",
      title: `MVR alert${row.driverNameHint ? `: ${row.driverNameHint}` : ""}`,
      body: `${row.headline} — check the driver's file before their next dispatch.`,
      link: "/hub/drivers",
    })
    imported++
  }
  return { imported, skipped }
}

// ---------------------------------------------------------------------------
// The one entry point the sync action and cron call
// ---------------------------------------------------------------------------

export async function runUniversalSync(
  provider: "atob" | "plaid" | "bestpass" | "prepass" | "fleetio" | "sambasafety",
  carrierId: string
): Promise<UniversalSyncResult> {
  switch (provider) {
    case "atob": {
      const source = atobSource(carrierId)
      if (!(await source.connected())) return { connected: false }
      const r = await ingestFuelRows(carrierId, "atob", "AtoB", await source.pull())
      return { connected: true, ...r, summary: `${r.imported} fuel transactions` }
    }
    case "plaid": {
      const source = plaidSource(carrierId)
      if (!(await source.connected())) return { connected: false }
      const r = await ingestFuelRows(carrierId, "plaid", "Bank feed", await source.pull())
      return { connected: true, ...r, summary: `${r.imported} fuel-spend rows from the bank feed` }
    }
    case "bestpass":
    case "prepass": {
      const source = provider === "bestpass" ? bestpassSource(carrierId) : prepassSource(carrierId)
      if (!(await source.connected())) return { connected: false }
      const r = await ingestTollRows(carrierId, provider, await source.pull())
      return { connected: true, ...r, summary: `${r.imported} toll transactions` }
    }
    case "fleetio": {
      const source = fleetioSource(carrierId)
      if (!(await source.connected())) return { connected: false }
      const r = await ingestFleetioRows(carrierId, await source.pull())
      return { connected: true, ...r, summary: `${r.imported} service entries` }
    }
    case "sambasafety": {
      const source = sambasafetySource(carrierId)
      if (!(await source.connected())) return { connected: false }
      const r = await ingestMvrAlerts(carrierId, await source.pull())
      return { connected: true, ...r, summary: `${r.imported} new MVR alerts` }
    }
  }
}
