/**
 * Reference SyncSource implementation for the adapter contract test
 * (__tests__/integration-contract.test.ts). Every real adapter (EFS, DAT,
 * ...) must satisfy the same shape this proves: deterministic external ids,
 * idempotent replays through a sink keyed on (carrier, source, external_id),
 * and a hard refusal to pull while disconnected.
 */
import type { SyncRowBase, SyncSource } from "./registry"

export interface MockRow extends SyncRowBase {
  value: number
}

export function mockSource(opts: {
  provider?: string
  rows?: number
  connected?: boolean
} = {}): SyncSource<MockRow> {
  const { provider = "mock", rows = 3, connected = true } = opts
  return {
    provider,
    async connected() {
      return connected
    },
    async pull() {
      if (!connected) throw new Error(`${provider} is not connected`)
      return Array.from({ length: rows }, (_, i) => ({ external_id: `${provider}-${i}`, value: i }))
    },
  }
}

/**
 * Stands in for the real `ON CONFLICT (carrier_id, source, external_id) DO
 * NOTHING` upsert every adapter's ingest step uses — same dedupe key, same
 * semantics, so the contract test proves the pattern without Postgres.
 */
export interface MemorySink {
  rows: Array<SyncRowBase & { carrierId: string; source: string }>
  ingest<Row extends SyncRowBase>(
    carrierId: string,
    source: string,
    incoming: Row[]
  ): { inserted: number; skipped: number }
}

export function memorySink(): MemorySink {
  const seen = new Set<string>()
  const rows: Array<SyncRowBase & { carrierId: string; source: string }> = []
  return {
    rows,
    ingest(carrierId, source, incoming) {
      let inserted = 0
      let skipped = 0
      for (const row of incoming) {
        const key = `${carrierId}:${source}:${row.external_id}`
        if (seen.has(key)) {
          skipped++
          continue
        }
        seen.add(key)
        rows.push({ ...row, carrierId, source })
        inserted++
      }
      return { inserted, skipped }
    },
  }
}
