/**
 * Mock provider — the stub-first doctrine's test double. Every real adapter
 * (FuelSource, LoadSource, TelematicsSource variants) must behave like this
 * against the contract suite BEFORE any vendor credentials exist: stable
 * external ids across pulls (idempotency), honest connected() state, and
 * deterministic rows so tests assert exact ingestion counts.
 *
 * Pure — no DB, no network. Used by __tests__/integration-contract.test.ts
 * and available to any adapter's own tests.
 */
import type { SyncRowBase, SyncSource } from "./registry"

export interface MockRow extends SyncRowBase {
  ts: string
  amount_cents: number
  note: string
}

export function mockSource(options: {
  provider?: string
  connected?: boolean
  rows?: number
} = {}): SyncSource<MockRow> {
  const { provider = "mock", connected = true, rows = 3 } = options
  return {
    provider,
    async connected() {
      return connected
    },
    async pull() {
      if (!connected) throw new Error(`${provider} is not connected`)
      // Deterministic: same ids every pull — replays must not duplicate.
      return Array.from({ length: rows }, (_, i) => ({
        external_id: `${provider}-evt-${i + 1}`,
        ts: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
        amount_cents: (i + 1) * 1000,
        note: `mock row ${i + 1}`,
      }))
    },
  }
}

/**
 * In-memory idempotent sink mirroring the DB contract
 * `ON CONFLICT (carrier_id, source, external_id) DO NOTHING`.
 * Adapters' ingestion logic is tested against this before touching Postgres.
 */
export function memorySink<Row extends SyncRowBase>() {
  const seen = new Set<string>()
  const stored: Row[] = []
  return {
    ingest(carrierId: string, source: string, rows: Row[]): { inserted: number; skipped: number } {
      let inserted = 0
      let skipped = 0
      for (const row of rows) {
        const key = `${carrierId}\x00${source}\x00${row.external_id}`
        if (seen.has(key)) {
          skipped++
          continue
        }
        seen.add(key)
        stored.push(row)
        inserted++
      }
      return { inserted, skipped }
    },
    rows: stored,
  }
}
