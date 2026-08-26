/**
 * WEX fuel card feed (lane-integrations slice) — same `SyncSource<Row>`
 * contract and same ingest target (hub.fuel_transactions) as efs.ts and
 * comdata.ts. WEX's data-feed credentials are provisioned by the account
 * rep alongside EFS (see docs/integrations/creds-shopping-list.md row 3),
 * so this reuses EFS's feed-username/password shape rather than an
 * API-key pair. Until a real feed response confirms the shape, the HTTP
 * call stays isolated from `normalizeWexRecord`, a pure function the
 * contract tests exercise without a live feed.
 *
 * Transport reality (researched 2026-07-18, docs/integrations/wex.md): the
 * WEX-branded card feed is provisioned exactly like EFS's — a daily CSV
 * batch file over SFTP, delivered to a registered partner destination after
 * the carrier signs WEX Data Release Forms; there is no carrier-self-serve
 * REST endpoint for `wexSource().pull()` to hit (fleetapi.wexinc.com is
 * partner-tier only). Same remedy as EFS: any forwarder POSTs the daily
 * file to `/api/hub/webhooks/wex?carrier=<uuid>` as
 * `{"event":"fuel.batch","csv":…}`, HMAC-signed with the carrier's
 * `webhookSecret`, and `processWexEvent` lands rows through the SAME
 * idempotent ingest the cron sync uses.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { normalizeState } from "../csv"
import { query } from "../db"
import { parseFuelFeedCsv } from "./fuel-feed-csv"
import { dollarsToCents } from "../types"
import type { SyncRowBase, SyncSource } from "./registry"

export interface WexFuelRow extends SyncRowBase {
  ts: string
  unitHint: string | null
  merchant: string | null
  city: string | null
  jurisdiction: string | null
  gallons: number
  unitPriceCents: number | null
  totalCents: number
  odometer: number | null
}

/**
 * Pure normalizer — the ONE place the assumed WEX response shape is read.
 * Swapping in the confirmed shape once the feed is live only touches this
 * function; the adapter, ingest, and contract tests stay untouched.
 */
export function normalizeWexRecord(record: Record<string, unknown>): WexFuelRow {
  const gallons = record.Quantity
  const jurisdiction =
    typeof record.MerchantState === "string" && record.MerchantState.trim()
      ? normalizeState(record.MerchantState)
      : null

  return {
    external_id: String(record.TransactionId ?? ""),
    ts: String(record.TransactionDateTime ?? new Date().toISOString()),
    unitHint: (record.UnitNumber as string) ?? null,
    merchant: (record.MerchantName as string) ?? null,
    city: (record.MerchantCity as string) ?? null,
    jurisdiction,
    gallons: typeof gallons === "number" ? gallons : Number(gallons ?? 0) || 0,
    unitPriceCents: record.PricePerGallon != null ? dollarsToCents(record.PricePerGallon as number) : null,
    totalCents: dollarsToCents(record.TotalAmount as number | undefined),
    odometer: typeof record.Odometer === "number" ? record.Odometer : null,
  }
}

/** WEX feed client (docs/integrations/wex.md — shape unconfirmed until the rep replies). */
export function wexSource(carrierId: string): SyncSource<WexFuelRow> {
  const base = process.env.WEX_FEED_BASE ?? "https://api.wexinc.com/fleet/v1"

  return {
    provider: "wex",
    async connected() {
      return hasCredentials(carrierId, "wex")
    },
    async pull() {
      const creds = await getCredentials(carrierId, "wex")
      if (!creds?.feedUser || !creds?.feedPassword) throw new Error("wex is not connected")
      const auth = Buffer.from(`${creds.feedUser}:${creds.feedPassword}`).toString("base64")
      const response = await fetch(`${base}/transactions`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error(`WEX feed → HTTP ${response.status}`)
      const json = (await response.json()) as { transactions?: unknown[] }
      return ((json.transactions ?? []) as Record<string, unknown>[]).map(normalizeWexRecord)
    },
  }
}

/**
 * Idempotent ingest shared by the cron sync and the file-drop webhook: lands
 * rows in hub.fuel_transactions — the SAME table the CSV import, EFS, and
 * Comdata adapters write — on (carrier_id, source, external_id). Unit
 * matching is by unit-number hint; unmatched transactions still land
 * (truck_id NULL) and are reported, never guessed. Rows without an external
 * id are skipped outright — an empty idempotency key would collide unrelated
 * rows.
 */
export async function ingestWexRows(
  carrierId: string,
  rows: WexFuelRow[]
): Promise<{ imported: number; skipped: number; unmatched: string[] }> {
  const trucks = await query<{ id: string; unit_number: string }>(
    `SELECT id, unit_number FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL`,
    [carrierId]
  )
  const byUnit = new Map(trucks.map((t) => [t.unit_number.toLowerCase(), t.id]))
  const unmatched: string[] = []
  let imported = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.external_id) continue
    const truckId = row.unitHint ? byUnit.get(row.unitHint.toLowerCase()) ?? null : null
    if (row.unitHint && !truckId) unmatched.push(row.unitHint)

    const result = await query<{ id: string }>(
      `INSERT INTO hub.fuel_transactions
         (carrier_id, source, external_id, card_program, truck_id, ts, merchant, city,
          jurisdiction, gallons, unit_price_cents, total_cents, odometer, raw)
       VALUES ($1, 'wex', $2, 'WEX', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (carrier_id, source, external_id) DO NOTHING
       RETURNING id`,
      [
        carrierId, row.external_id, truckId, row.ts, row.merchant, row.city, row.jurisdiction,
        row.gallons, row.unitPriceCents, row.totalCents, row.odometer, JSON.stringify(row),
      ]
    )
    if (result.length > 0) imported++
    else skipped++
  }

  return { imported, skipped, unmatched: [...new Set(unmatched)] }
}

/** Scheduled/"Sync now" ingest (cron `wex-sync`) — the poll half, pending a partner REST feed. */
export async function runWexSync(
  carrierId: string
): Promise<{ connected: boolean; imported?: number; skipped?: number; unmatched?: string[] }> {
  const source = wexSource(carrierId)
  if (!(await source.connected())) return { connected: false }
  const { imported, skipped, unmatched } = await ingestWexRows(carrierId, await source.pull())
  return { connected: true, imported, skipped, unmatched }
}

export interface WexEventOutcome {
  applied: boolean
  reason?: string
  imported?: number
  skipped?: number
  invalid?: number
  unmatched?: string[]
}

/** Event kinds the file-drop processor knows how to ingest. */
const FILE_DROP_EVENT_KINDS = new Set(["fuel.batch"])

/**
 * Webhook processor (EVENT_PROCESSORS["wex"] in the receiver route): applies
 * one verified file drop — the mirror of `processEfsEvent`, since both cards
 * deliver the same daily SFTP CSV. Payload carries either the raw file
 * (`csv`) or already-parsed records (`transactions`). Replays are safe twice
 * over — the receiver dedups identical bodies by content hash, and every row
 * goes through the same ON CONFLICT ingest as the cron path. Rows without a
 * recognizable transaction id are counted and refused, never guessed.
 */
export async function processWexEvent(
  carrierId: string,
  event: { external_id: string; kind: string | null; payload: Record<string, unknown> }
): Promise<WexEventOutcome> {
  if (!event.kind || !FILE_DROP_EVENT_KINDS.has(event.kind)) {
    return { applied: false, reason: `unhandled event kind: ${event.kind ?? "none"}` }
  }

  const records =
    typeof event.payload.csv === "string"
      ? parseFuelFeedCsv(event.payload.csv)
      : Array.isArray(event.payload.transactions)
        ? (event.payload.transactions as Record<string, unknown>[])
        : []
  if (records.length === 0) return { applied: false, reason: "no fuel rows in payload" }

  const rows = records.map(normalizeWexRecord)
  const valid = rows.filter((r) => r.external_id !== "")
  const invalid = rows.length - valid.length
  if (valid.length === 0) return { applied: false, invalid, reason: "rows missing transaction ids" }

  const { imported, skipped, unmatched } = await ingestWexRows(carrierId, valid)
  return { applied: true, imported, skipped, unmatched, ...(invalid > 0 ? { invalid } : {}) }
}
