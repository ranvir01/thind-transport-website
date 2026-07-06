/**
 * EFS/WEX FuelSource (lane-integrations slice 1) — daily transaction feed
 * behind the SyncSource<Row> contract (registry.ts). EFS provisions feed
 * credentials separately from the portal login (ask the account rep — see
 * docs/integrations/efs.md for the scouting notes and open questions).
 * Until credentials exist this reports not-connected and Import → Fuel CSV
 * stays the product; the two paths land in the exact same table.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { normalizeState } from "../csv"
import { query } from "../db"
import type { SyncRowBase, SyncSource } from "./registry"

export interface EfsTransaction extends SyncRowBase {
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
 * (__tests__/efs.test.ts) without a live feed or a mocked fetch. Field names
 * are the doc's best guess (docs/integrations/efs.md); adjust here the day
 * a real feed response comes back.
 */
export function normalizeEfsRow(row: Record<string, unknown>): EfsTransaction {
  const gallons = typeof row.gallons === "number" ? row.gallons : Number(row.gallons ?? 0)
  const pricePerGallon = typeof row.pricePerGallon === "number" ? row.pricePerGallon : Number(row.pricePerGallon ?? NaN)
  const totalAmount = typeof row.totalAmount === "number" ? row.totalAmount : Number(row.totalAmount ?? NaN)
  const odometer = typeof row.odometer === "number" ? row.odometer : Number(row.odometer ?? NaN)
  const jurisdiction = typeof row.state === "string" && row.state.trim() ? normalizeState(row.state) : null

  return {
    external_id: String(row.transactionId ?? row.id ?? ""),
    ts: typeof row.transactionDate === "string" ? row.transactionDate : new Date().toISOString(),
    unitHint: (row.unitNumber as string) ?? (row.vehicleId as string) ?? null,
    merchant: (row.merchantName as string) ?? null,
    city: (row.city as string) ?? null,
    jurisdiction,
    gallons: Number.isFinite(gallons) ? gallons : 0,
    unitPriceCents: Number.isFinite(pricePerGallon) ? Math.round(pricePerGallon * 100) : null,
    totalCents: Number.isFinite(totalAmount) ? Math.round(totalAmount * 100) : 0,
    odometer: Number.isFinite(odometer) ? odometer : null,
  }
}

export function efsSource(carrierId: string): SyncSource<EfsTransaction> {
  const base = process.env.EFS_FEED_BASE ?? "https://api.efsllc.com/carriercontrol/v1"
  return {
    provider: "efs",
    async connected() {
      return hasCredentials(carrierId, "efs")
    },
    async pull() {
      const creds = await getCredentials(carrierId, "efs")
      if (!creds?.feedUser || !creds?.feedPassword) throw new Error("EFS feed not connected")
      const auth = Buffer.from(`${creds.feedUser}:${creds.feedPassword}`).toString("base64")
      const response = await fetch(`${base}/transactions`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error(`EFS feed → HTTP ${response.status}`)
      const json = (await response.json()) as { transactions?: unknown[] }
      return ((json.transactions ?? []) as Record<string, unknown>[]).map(normalizeEfsRow)
    },
  }
}

/**
 * Scheduled/"Sync now" ingest: lands rows in hub.fuel_transactions — the
 * SAME table the CSV import writes — idempotently on (carrier_id, source,
 * external_id). Unit matching is by unit-number hint; unmatched units are
 * reported, never guessed (mirrors runTelematicsSync in telematics.ts).
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
    if (!row.external_id || row.totalCents <= 0) continue
    const truckId = row.unitHint ? byUnit.get(row.unitHint.toLowerCase()) : undefined
    if (row.unitHint && !truckId) unmatched.push(row.unitHint)

    const inserted = await query<{ id: string }>(
      `INSERT INTO hub.fuel_transactions (
         carrier_id, source, external_id, card_program, truck_id, ts, merchant, city,
         jurisdiction, gallons, unit_price_cents, total_cents, odometer, raw
       ) VALUES ($1,'efs',$2,'EFS',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
