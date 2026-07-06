/**
 * EFS fuel card feed — first FuelSource adapter (stub-first per
 * docs/integrations/README.md + docs/integrations/efs.md). The real feed
 * shape isn't confirmed until the carrier's data-feed request comes back
 * from EFS, so the HTTP call is isolated from `normalizeEfsRecord`, a pure
 * function the contract tests exercise without a live feed. Without
 * credentials the source reports `connected(): false` and the CSV fuel
 * import stays the product — the rest of the app never knows which path a
 * transaction arrived through.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { query } from "../db"
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
 * Scheduled sync (cron `efs-sync`): lands rows in hub.fuel_transactions —
 * the SAME table the fuel CSV import writes to — via the identical
 * `ON CONFLICT (carrier_id, source, external_id) DO NOTHING` idempotency
 * key, so replays never duplicate a charge. Unit matching is by unit
 * number hint; unmatched transactions still land (truck_id NULL) and are
 * reported, never dropped.
 */
export async function runEfsSync(
  carrierId: string
): Promise<{ connected: boolean; imported?: number; skipped?: number; unmatched?: string[] }> {
  const source = efsSource(carrierId)
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

  return { connected: true, imported, skipped, unmatched }
}
