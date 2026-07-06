/**
 * WEX fuel card feed (lane-integrations slice) — same `SyncSource<Row>`
 * contract and same ingest target (hub.fuel_transactions) as efs.ts and
 * comdata.ts. WEX's data-feed credentials are provisioned by the account
 * rep alongside EFS (see docs/integrations/creds-shopping-list.md row 3),
 * so this reuses EFS's feed-username/password shape rather than an
 * API-key pair. Until a real feed response confirms the shape, the HTTP
 * call stays isolated from `normalizeWexRecord`, a pure function the
 * contract tests exercise without a live feed.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { normalizeState } from "../csv"
import { query } from "../db"
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
 * Scheduled/"Sync now" ingest: lands rows in hub.fuel_transactions — the
 * SAME table the CSV import, EFS, and Comdata adapters write — idempotently
 * on (carrier_id, source, external_id). Unit matching is by unit-number
 * hint; unmatched transactions still land (truck_id NULL) and are
 * reported, never guessed (mirrors runEfsSync/runComdataSync).
 */
export async function runWexSync(
  carrierId: string
): Promise<{ connected: boolean; imported?: number; skipped?: number; unmatched?: string[] }> {
  const source = wexSource(carrierId)
  if (!(await source.connected())) return { connected: false }

  const trucks = await query<{ id: string; unit_number: string }>(
    `SELECT id, unit_number FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL`,
    [carrierId]
  )
  const byUnit = new Map(trucks.map((t) => [t.unit_number.toLowerCase(), t.id]))
  const unmatched: string[] = []
  let imported = 0
  let skipped = 0

  for (const row of await source.pull()) {
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

  return { connected: true, imported, skipped, unmatched: [...new Set(unmatched)] }
}
