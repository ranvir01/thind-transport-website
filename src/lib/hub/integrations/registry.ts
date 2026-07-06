/**
 * The adapter contract every provider client implements, mock included
 * (see mock.ts and docs/integrations/README.md). Pure module — no DB, no
 * fetch — so the contract itself is testable without credentials or a
 * live vendor feed.
 */

export interface SyncRowBase {
  /** Stable id from the provider's side — ingestion keys off this. */
  external_id: string
}

export interface SyncSource<Row extends SyncRowBase> {
  provider: string
  /** True only when this carrier has usable credentials for this provider. */
  connected(): Promise<boolean>
  /** Normalized rows since the last pull. Must throw, never guess, when disconnected. */
  pull(): Promise<Row[]>
}
