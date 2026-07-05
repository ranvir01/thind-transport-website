/**
 * Integration provider registry — the single source of truth for every
 * third-party connection LoadOff can make. The settings page, credential
 * field allowlists, cron sync loop, and webhook receiver all read THIS,
 * so adding a provider is one entry here (+ a client module) — never a
 * scatter of hardcoded lists.
 *
 * Doctrine (AGENTS.md): every provider ships stub-first (mock + contract
 * tests), keeps a CSV/manual fallback that always works, lands data through
 * idempotent `ON CONFLICT (carrier_id, source, external_id)` upserts into the
 * same tables the CSV path uses, and writes a hub.integration_syncs row on
 * every run. Pure module — no DB, no fetch; safe for client, server, tests.
 */

export type SyncKind = "poll" | "webhook" | "manual"

export type ProviderStatus =
  | "live"      // client implemented and activatable with credentials
  | "stub"      // credentials UI only — client not yet built (lane target)
  | "planned"   // not even a card yet — roadmap entry for the fleet

export interface ProviderSpec {
  id: string
  label: string
  domain: "telematics" | "loadboard" | "fuel" | "accounting" | "factoring" | "docs"
  blurb: string
  /** Credential field names the connect form may store (allowlist). */
  fields: string[]
  /** The always-working path when the integration is off. */
  fallback: string
  sync: SyncKind
  status: ProviderStatus
  /** Cron job name when sync === "poll" and a client exists. */
  cronJob?: string
}

export const PROVIDERS: readonly ProviderSpec[] = [
  {
    id: "terminal", label: "Terminal (TruckX ELD)", domain: "telematics",
    blurb: "Live truck positions + HOS clocks through the Terminal aggregator.",
    fields: ["apiKey", "connectionToken"],
    fallback: "Positions CSV import", sync: "poll", status: "live", cronJob: "telematics-sync",
  },
  {
    id: "truckercloud", label: "TruckerCloud ELD", domain: "telematics",
    blurb: "Alternate ELD aggregator — drop-in TelematicsSource adapter.",
    fields: ["apiKey"],
    fallback: "Positions CSV import", sync: "poll", status: "stub",
  },
  {
    id: "mailbox", label: "Docs mailbox (IMAP)", domain: "docs",
    blurb: "Polls an inbox and files rate cons/PODs onto matching loads.",
    fields: ["host", "port", "user", "password", "folder"],
    fallback: "Manual document upload", sync: "poll", status: "live", cronJob: "docs-mailbox",
  },
  {
    id: "dat", label: "DAT load board", domain: "loadboard",
    blurb: "Search and book freight without leaving LoadOff.",
    fields: ["serviceAccountEmail", "password"],
    fallback: "Paste rate con", sync: "poll", status: "stub",
  },
  {
    id: "truckstop", label: "Truckstop.com", domain: "loadboard",
    blurb: "Second load board — same LoadSource adapter contract as DAT.",
    fields: ["apiKey"],
    fallback: "Paste rate con", sync: "poll", status: "planned",
  },
  {
    id: "efs", label: "EFS fuel card", domain: "fuel",
    blurb: "Daily fuel transactions straight into MPG, fraud flags, and fuel→load.",
    fields: ["feedUser", "feedPassword"],
    fallback: "Fuel statement CSV import", sync: "poll", status: "stub",
  },
  {
    id: "wex", label: "WEX fuel card", domain: "fuel",
    blurb: "Same FuelSource contract as EFS.",
    fields: ["feedUser", "feedPassword"],
    fallback: "Fuel statement CSV import", sync: "poll", status: "stub",
  },
  {
    id: "comdata", label: "Comdata fuel card", domain: "fuel",
    blurb: "Same FuelSource contract as EFS.",
    fields: ["apiKey", "apiSecret"],
    fallback: "Fuel statement CSV import", sync: "poll", status: "stub",
  },
  {
    id: "qbo", label: "QuickBooks Online", domain: "accounting",
    blurb: "Invoices and payments sync both ways — no more CSV re-keying.",
    fields: ["clientId", "clientSecret", "refreshToken", "realmId"],
    fallback: "QuickBooks CSV export", sync: "poll", status: "planned",
  },
  {
    id: "factor", label: "Factoring company", domain: "factoring",
    blurb: "Submit factored invoices electronically; track advances and reserves.",
    fields: ["apiKey", "webhookSecret"],
    fallback: "Email the factor the invoice PDF", sync: "webhook", status: "planned",
  },
] as const

export type RegisteredProvider = (typeof PROVIDERS)[number]["id"]

export function providerSpec(id: string): ProviderSpec | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

/** Field allowlist for the credentials action — derived, never duplicated. */
export function allowedFields(id: string): string[] {
  return providerSpec(id)?.fields ?? []
}

/**
 * The adapter contract every provider client implements (mock included).
 * `pull` returns normalized rows carrying the provider's stable external id —
 * ingestion stays idempotent no matter how often a sync repeats.
 */
export interface SyncSource<Row> {
  provider: string
  connected(): Promise<boolean>
  pull(): Promise<Row[]>
}

export interface SyncRowBase {
  external_id: string
}
