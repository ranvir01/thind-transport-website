/**
 * EFS fuel card feed — first FuelSource adapter (stub-first per
 * docs/integrations/README.md + docs/integrations/efs.md). The real feed
 * shape isn't confirmed until the carrier's data-feed request comes back
 * from EFS, so the HTTP call is isolated from `normalizeEfsRecord`, a pure
 * function the contract tests exercise without a live feed. Without
 * credentials the source reports `connected(): false` and the CSV fuel
 * import stays the product — the rest of the app never knows which path a
 * transaction arrived through.
 *
 * Transport reality (researched 2026-07-11, docs/integrations/efs.md): the
 * feed EFS actually provisions is a daily CSV file over SFTP — there is no
 * REST endpoint for `efsSource().pull()` to hit. Vercel functions can't hold
 * SFTP sessions and an SSH lib is a banned heavy dependency, so the shipped
 * inbound path is a FILE DROP: any forwarder (a one-line curl in a cron on
 * the office machine, or the Go worker later) POSTs the daily file to
 * `/api/hub/webhooks/efs?carrier=<uuid>` as `{"event":"fuel.batch","csv":…}`,
 * HMAC-signed with the carrier's `webhookSecret`. `processEfsEvent` parses it
 * and lands rows through the SAME idempotent ingest the cron sync uses.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { query } from "../db"
import { parseFuelFeedCsv } from "./fuel-feed-csv"
import { dollarsToCents } from "../types"
import type { SyncRowBase, SyncSource } from "./registry"

export interface EfsFuelRow extends SyncRowBase {
  ts: string
  unitHint: string | null
  merchant: string | null
  city: string | null
  jurisdiction: string | null
  gallons: number
  unitPriceCents: number | null
  totalCents: number
  odometer: number | null
  raw: Record<string, unknown>
}

/**
 * Pure normalizer — the ONE place the assumed EFS response shape is read.
 * Swapping in the confirmed shape once the feed is live only touches this
 * function; the adapter, ingest, and contract tests stay untouched.
 */
export function normalizeEfsRecord(record: Record<string, unknown>): EfsFuelRow {
  const gallons = record.Quantity
  return {
    external_id: String(record.TransactionId ?? ""),
    ts: String(record.TransactionDateTime ?? new Date().toISOString()),
    unitHint: (record.UnitNumber as string) ?? null,
    merchant: (record.MerchantName as string) ?? null,
    city: (record.MerchantCity as string) ?? null,
    jurisdiction: (record.MerchantState as string) ?? null,
    gallons: typeof gallons === "number" ? gallons : Number(gallons ?? 0) || 0,
    unitPriceCents: record.PricePerGallon != null ? dollarsToCents(record.PricePerGallon as number) : null,
    totalCents: dollarsToCents(record.TotalAmount as number | undefined),
    odometer: typeof record.Odometer === "number" ? record.Odometer : null,
    raw: record,
  }
}

/** EFS feed client (docs/integrations/efs.md — shape unconfirmed until the rep replies). */
export function efsSource(carrierId: string): SyncSource<EfsFuelRow> {
  const base = process.env.EFS_FEED_BASE ?? "https://feed.efsllc.com/v1"

  return {
    provider: "efs",
    async connected() {
      return hasCredentials(carrierId, "efs")
    },
    async pull() {
      const creds = await getCredentials(carrierId, "efs")
      if (!creds?.feedUser || !creds?.feedPassword) throw new Error("efs is not connected")
      const auth = Buffer.from(`${creds.feedUser}:${creds.feedPassword}`).toString("base64")
      const response = await fetch(`${base}/transactions`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error(`EFS feed → HTTP ${response.status}`)
      const json = (await response.json()) as { transactions?: unknown[] }
      return ((json.transactions ?? []) as Record<string, unknown>[]).map(normalizeEfsRecord)
    },
  }
}

/**
 * Idempotent ingest shared by the cron sync and the file-drop webhook: lands
 * rows in hub.fuel_transactions — the SAME table the fuel CSV import writes
 * to — via the identical `ON CONFLICT (carrier_id, source, external_id)
 * DO NOTHING` key, so replays never duplicate a charge. Unit matching is by
 * unit number hint; unmatched transactions still land (truck_id NULL) and
 * are reported, never dropped.
 */
export async function ingestEfsRows(
  carrierId: string,
  rows: EfsFuelRow[]
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
    const truckId = row.unitHint ? byUnit.get(row.unitHint.toLowerCase()) ?? null : null
    if (row.unitHint && !truckId) unmatched.push(row.unitHint)

    const result = await query<{ id: string }>(
      `INSERT INTO hub.fuel_transactions
         (carrier_id, source, external_id, card_program, truck_id, ts, merchant, city,
          jurisdiction, gallons, unit_price_cents, total_cents, odometer, raw)
       VALUES ($1, 'efs', $2, 'EFS', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (carrier_id, source, external_id) DO NOTHING
       RETURNING id`,
      [
        carrierId, row.external_id, truckId, row.ts, row.merchant, row.city, row.jurisdiction,
        row.gallons, row.unitPriceCents, row.totalCents, row.odometer, JSON.stringify(row.raw),
      ]
    )
    if (result.length > 0) imported++
    else skipped++
  }

  return { imported, skipped, unmatched }
}

/** Scheduled sync (cron `efs-sync`) — the poll half, pending a partner REST feed. */
export async function runEfsSync(
  carrierId: string
): Promise<{ connected: boolean; imported?: number; skipped?: number; unmatched?: string[] }> {
  const source = efsSource(carrierId)
  if (!(await source.connected())) return { connected: false }
  const { imported, skipped, unmatched } = await ingestEfsRows(carrierId, await source.pull())
  return { connected: true, imported, skipped, unmatched }
}

export interface EfsEventOutcome {
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
 * Webhook processor (EVENT_PROCESSORS["efs"] in the receiver route): applies
 * one verified file drop. Payload carries either the raw file (`csv`) or
 * already-parsed records (`transactions`). Replays are safe twice over — the
 * receiver dedups identical bodies by content hash, and every row goes
 * through the same ON CONFLICT ingest as the cron path. Rows without a
 * recognizable transaction id are counted and refused (an empty external id
 * would make unrelated rows collide on the idempotency key), never guessed.
 */
export async function processEfsEvent(
  carrierId: string,
  event: { external_id: string; kind: string | null; payload: Record<string, unknown> }
): Promise<EfsEventOutcome> {
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

  const rows = records.map(normalizeEfsRecord)
  const valid = rows.filter((r) => r.external_id !== "")
  const invalid = rows.length - valid.length
  if (valid.length === 0) return { applied: false, invalid, reason: "rows missing transaction ids" }

  const { imported, skipped, unmatched } = await ingestEfsRows(carrierId, valid)
  return { applied: true, imported, skipped, unmatched, ...(invalid > 0 ? { invalid } : {}) }
}
