/**
 * Comdata FuelSource (lane-integrations slice 2) — same SyncSource<Row>
 * contract as efs.ts, same ingest target (hub.fuel_transactions). Comdata
 * access is arranged per-carrier through the account team (see
 * docs/integrations/comdata.md for scouting notes and open questions);
 * until credentials exist this reports not-connected and Import → Fuel CSV
 * stays the product.
 *
 * Transport reality (researched 2026-07-18, docs/integrations/comdata.md):
 * Comdata is a Corpay brand and — unlike EFS/WEX — has real machine
 * channels: SOAP Fleet Credit Web Services at api.iconnectdata.com
 * (WS-Security UsernameToken, per-requestor profile provisioned by Comdata
 * associates), a REST developer portal with generated API keys/tokens, and
 * a partner daily-file feed (the fixed-width AC00029 layout Geotab ingests).
 * The key/secret REST pull below therefore survives as a plausible shape,
 * but the proven third-party delivery is still a daily file — so the same
 * signed file-drop webhook EFS/WEX use is wired here too: any forwarder
 * POSTs the day's transactions to `/api/hub/webhooks/comdata?carrier=<uuid>`
 * as `{"event":"fuel.batch","csv":…}` (or pre-parsed `transactions`),
 * HMAC-signed with the carrier's `webhookSecret`, and `processComdataEvent`
 * lands rows through the SAME idempotent ingest the cron sync uses.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { normalizeState } from "../csv"
import { query } from "../db"
import { parseFuelFeedCsv } from "./fuel-feed-csv"
import type { SyncRowBase, SyncSource } from "./registry"

export interface ComdataTransaction extends SyncRowBase {
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
 * Pure normalizer — kept separate from the fetch call so it's unit-testable
 * (__tests__/comdata.test.ts) without a live feed, and the ONE place the
 * assumed Comdata shape is read. Accepts both the camelCase REST-pull field
 * names (docs/integrations/comdata.md) and the canonical PascalCase keys
 * `parseFuelFeedCsv` emits for file drops; adjust here the day a real feed
 * response or provisioned file lands.
 */
export function normalizeComdataRow(row: Record<string, unknown>): ComdataTransaction {
  const quantity = row.quantity ?? row.Quantity
  const gallons = typeof quantity === "number" ? quantity : Number(quantity ?? 0)
  const price = row.unitPrice ?? row.PricePerGallon
  const unitPrice = typeof price === "number" ? price : Number(price ?? NaN)
  const total = row.amount ?? row.TotalAmount
  const amount = typeof total === "number" ? total : Number(total ?? NaN)
  const odo = row.odometer ?? row.Odometer
  const odometer = typeof odo === "number" ? odo : Number(odo ?? NaN)
  const state = row.state ?? row.MerchantState
  const jurisdiction = typeof state === "string" && state.trim() ? normalizeState(state) : null

  return {
    external_id: String(row.transactionId ?? row.id ?? row.TransactionId ?? ""),
    ts:
      typeof row.postedDate === "string"
        ? row.postedDate
        : typeof row.TransactionDateTime === "string"
          ? row.TransactionDateTime
          : new Date().toISOString(),
    unitHint: (row.truckNumber as string) ?? (row.unitId as string) ?? (row.UnitNumber as string) ?? null,
    merchant: (row.merchant as string) ?? (row.MerchantName as string) ?? null,
    city: (row.city as string) ?? (row.MerchantCity as string) ?? null,
    jurisdiction,
    gallons: Number.isFinite(gallons) ? gallons : 0,
    unitPriceCents: Number.isFinite(unitPrice) ? Math.round(unitPrice * 100) : null,
    totalCents: Number.isFinite(amount) ? Math.round(amount * 100) : 0,
    odometer: Number.isFinite(odometer) ? odometer : null,
  }
}

export function comdataSource(carrierId: string): SyncSource<ComdataTransaction> {
  const base = process.env.COMDATA_FEED_BASE ?? "https://api.comdata.com/fleet/v1"
  return {
    provider: "comdata",
    async connected() {
      return hasCredentials(carrierId, "comdata")
    },
    async pull() {
      const creds = await getCredentials(carrierId, "comdata")
      if (!creds?.apiKey || !creds?.apiSecret) throw new Error("Comdata not connected")
      const response = await fetch(`${base}/transactions`, {
        headers: { "Api-Key": creds.apiKey, "Api-Secret": creds.apiSecret },
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error(`Comdata feed → HTTP ${response.status}`)
      const json = (await response.json()) as { transactions?: unknown[] }
      return ((json.transactions ?? []) as Record<string, unknown>[]).map(normalizeComdataRow)
    },
  }
}

/**
 * Idempotent ingest shared by the cron sync and the file-drop webhook: lands
 * rows in hub.fuel_transactions — the SAME table the CSV import, EFS, and
 * WEX adapters write — on (carrier_id, source, external_id). Unit matching
 * is by unit-number hint; unmatched units are reported, never guessed. Rows
 * without an external id or without a positive total are dropped outright
 * (an empty idempotency key would collide unrelated rows; zero-amount rows
 * are declines/reversals this feed shouldn't book as fuel).
 */
export async function ingestComdataRows(
  carrierId: string,
  rows: ComdataTransaction[]
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
    if (!row.external_id || row.totalCents <= 0) continue
    const truckId = row.unitHint ? byUnit.get(row.unitHint.toLowerCase()) : undefined
    if (row.unitHint && !truckId) unmatched.push(row.unitHint)

    const inserted = await query<{ id: string }>(
      `INSERT INTO hub.fuel_transactions (
         carrier_id, source, external_id, card_program, truck_id, ts, merchant, city,
         jurisdiction, gallons, unit_price_cents, total_cents, odometer, raw
       ) VALUES ($1,'comdata',$2,'Comdata',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (carrier_id, source, external_id) DO NOTHING
       RETURNING id`,
      [
        carrierId, row.external_id, truckId ?? null, row.ts, row.merchant, row.city, row.jurisdiction,
        row.gallons, row.unitPriceCents, row.totalCents, row.odometer, JSON.stringify(row),
      ]
    )
    if (inserted.length) imported++
    else skipped++
  }

  return { imported, skipped, unmatched: [...new Set(unmatched)] }
}

/** Scheduled/"Sync now" ingest (cron `comdata-sync`) — the poll half, pending real credentials. */
export async function runComdataSync(
  carrierId: string
): Promise<{ connected: boolean; imported?: number; skipped?: number; unmatched?: string[] }> {
  const source = comdataSource(carrierId)
  if (!(await source.connected())) return { connected: false }
  const { imported, skipped, unmatched } = await ingestComdataRows(carrierId, await source.pull())
  return { connected: true, imported, skipped, unmatched }
}

export interface ComdataEventOutcome {
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
 * Webhook processor (EVENT_PROCESSORS["comdata"] in the receiver route):
 * applies one verified file drop — the mirror of processEfsEvent /
 * processWexEvent, because the proven third-party Comdata delivery is a
 * daily file (AC00029 to Geotab). Payload carries either the raw file
 * (`csv` — Comdata's native AC00029 is fixed-width, so the forwarder
 * converts, e.g. an iConnectData report export) or already-parsed records
 * (`transactions`). Replays are safe twice over — the receiver dedups
 * identical bodies by content hash, and every row goes through the same
 * ON CONFLICT ingest as the cron path. Rows without a recognizable
 * transaction id are counted and refused, never guessed.
 */
export async function processComdataEvent(
  carrierId: string,
  event: { external_id: string; kind: string | null; payload: Record<string, unknown> }
): Promise<ComdataEventOutcome> {
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

  const rows = records.map(normalizeComdataRow)
  const valid = rows.filter((r) => r.external_id !== "")
  const invalid = rows.length - valid.length
  if (valid.length === 0) return { applied: false, invalid, reason: "rows missing transaction ids" }

  const { imported, skipped, unmatched } = await ingestComdataRows(carrierId, valid)
  return { applied: true, imported, skipped, unmatched, ...(invalid > 0 ? { invalid } : {}) }
}
