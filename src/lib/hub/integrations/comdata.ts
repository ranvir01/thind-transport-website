/**
 * Comdata FuelSource (lane-integrations slice 2) — same SyncSource<Row>
 * contract as efs.ts, same ingest target (hub.fuel_transactions). Comdata
 * access is arranged per-carrier through the account team (see
 * docs/integrations/comdata.md for scouting notes and open questions);
 * until credentials exist this reports not-connected and Import → Fuel CSV
 * stays the product.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { normalizeState } from "../csv"
import { query } from "../db"
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
 * (__tests__/comdata.test.ts) without a live feed. Field names are the doc's
 * best guess (docs/integrations/comdata.md); adjust here the day a real
 * feed response comes back.
 */
export function normalizeComdataRow(row: Record<string, unknown>): ComdataTransaction {
  const gallons = typeof row.quantity === "number" ? row.quantity : Number(row.quantity ?? 0)
  const unitPrice = typeof row.unitPrice === "number" ? row.unitPrice : Number(row.unitPrice ?? NaN)
  const amount = typeof row.amount === "number" ? row.amount : Number(row.amount ?? NaN)
  const odometer = typeof row.odometer === "number" ? row.odometer : Number(row.odometer ?? NaN)
  const jurisdiction = typeof row.state === "string" && row.state.trim() ? normalizeState(row.state) : null

  return {
    external_id: String(row.transactionId ?? row.id ?? ""),
    ts: typeof row.postedDate === "string" ? row.postedDate : new Date().toISOString(),
    unitHint: (row.truckNumber as string) ?? (row.unitId as string) ?? null,
    merchant: (row.merchant as string) ?? null,
    city: (row.city as string) ?? null,
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
 * Scheduled/"Sync now" ingest: lands rows in hub.fuel_transactions — the
 * SAME table the CSV import and EFS adapter write — idempotently on
 * (carrier_id, source, external_id). Unit matching is by unit-number hint;
 * unmatched units are reported, never guessed (mirrors runEfsSync).
 */
export async function runComdataSync(
  carrierId: string
): Promise<{ connected: boolean; imported?: number; skipped?: number; unmatched?: string[] }> {
  const source = comdataSource(carrierId)
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

  return { connected: true, imported, skipped, unmatched: [...new Set(unmatched)] }
}
