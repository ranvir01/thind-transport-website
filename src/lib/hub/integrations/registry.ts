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
  | "planned"   // roadmap entry for the fleet — card shows honestly as planned

export interface CredentialField {
  key: string
  label: string
  /** Masked in the connect form (rendered as a password input). */
  secret?: boolean
}

export interface ProviderSpec {
  id: string
  label: string
  domain: "telematics" | "loadboard" | "fuel" | "accounting" | "factoring" | "docs"
  blurb: string
  /** Credential fields the connect form may store (keys are the allowlist). */
  fields: CredentialField[]
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
    blurb: "Live truck positions + HOS clocks through the Terminal aggregator — open an account at withterminal.com and authorize TruckX.",
    fields: [
      { key: "apiKey", label: "Terminal API key", secret: true },
      { key: "connectionToken", label: "Connection token", secret: true },
    ],
    fallback: "Positions CSV import", sync: "poll", status: "live", cronJob: "telematics-sync",
  },
  {
    id: "truckercloud", label: "TruckerCloud ELD", domain: "telematics",
    blurb: "Alternate ELD aggregator — drop-in TelematicsSource adapter.",
    fields: [
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client secret", secret: true },
    ],
    fallback: "Positions CSV import", sync: "poll", status: "live", cronJob: "telematics-sync",
  },
  {
    id: "mailbox", label: "Docs mailbox (IMAP)", domain: "docs",
    blurb: "Polls an inbox and files rate cons/PODs onto matching loads by reference number in the subject. Auth: Gmail app password, OR OAuth2 for Microsoft 365 (tenant + client ID/secret) / Google Workspace (service account key) — fill one set, leave the rest blank.",
    fields: [
      { key: "user", label: "Mailbox address" },
      { key: "password", label: "App password (Gmail only — M365/Workspace use OAuth2 below)", secret: true },
      { key: "tenantId", label: "Microsoft 365 tenant ID (OAuth2)" },
      { key: "clientId", label: "Microsoft 365 client ID" },
      { key: "clientSecret", label: "Microsoft 365 client secret", secret: true },
      { key: "serviceAccountKey", label: "Google Workspace service account key JSON", secret: true },
      { key: "host", label: "IMAP host (blank = auto per auth method)" },
      { key: "port", label: "Port (993)" },
      { key: "folder", label: "Folder (default INBOX)" },
    ],
    fallback: "Manual document upload", sync: "poll", status: "live", cronJob: "docs-mailbox",
  },
  {
    id: "dat", label: "DAT load board", domain: "loadboard",
    blurb: "Search and book freight without leaving LoadOff. Needs a DAT service account with API entitlement (developer.dat.com).",
    fields: [
      { key: "serviceAccountEmail", label: "Service account email" },
      { key: "password", label: "Service account password", secret: true },
    ],
    fallback: "Paste rate con", sync: "manual", status: "live",
  },
  {
    id: "truckstop", label: "Truckstop.com", domain: "loadboard",
    blurb: "Second load board — same search adapter contract as DAT. Needs a Truckstop.com developer API key.",
    fields: [{ key: "apiKey", label: "API key", secret: true }],
    fallback: "Paste rate con", sync: "manual", status: "live",
  },
  {
    id: "efs", label: "EFS fuel card", domain: "fuel",
    blurb: "Daily fuel transactions straight into MPG, fraud flags, and fuel→load. Ask your EFS rep for data-feed credentials.",
    fields: [
      { key: "feedUser", label: "Feed username" },
      { key: "feedPassword", label: "Feed password", secret: true },
    ],
    fallback: "Fuel statement CSV import", sync: "poll", status: "live", cronJob: "efs-sync",
  },
  {
    id: "wex", label: "WEX fuel card", domain: "fuel",
    blurb: "Same FuelSource contract as EFS.",
    fields: [
      { key: "feedUser", label: "Feed username" },
      { key: "feedPassword", label: "Feed password", secret: true },
    ],
    fallback: "Fuel statement CSV import", sync: "poll", status: "live", cronJob: "wex-sync",
  },
  {
    id: "comdata", label: "Comdata fuel card", domain: "fuel",
    blurb: "Same FuelSource contract as EFS — request API credentials from your Comdata account team.",
    fields: [
      { key: "apiKey", label: "API key", secret: true },
      { key: "apiSecret", label: "API secret", secret: true },
    ],
    fallback: "Fuel statement CSV import", sync: "poll", status: "live", cronJob: "comdata-sync",
  },
  {
    id: "qbo", label: "QuickBooks Online", domain: "accounting",
    blurb: "Pulls QBO payments onto matching invoices by number and can push invoices into QBO with a matching DocNumber — both through recordPayment (status + audit + load cascade).",
    fields: [
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client secret", secret: true },
      { key: "refreshToken", label: "Refresh token", secret: true },
      { key: "realmId", label: "Realm (company) ID" },
    ],
    fallback: "QuickBooks CSV export", sync: "poll", status: "stub", cronJob: "qbo-sync",
  },
  {
    id: "factor", label: "Factoring company", domain: "factoring",
    blurb: "Submit factored invoices electronically; track advances and reserves. Pushes events to your webhook URL below.",
    fields: [
      { key: "apiKey", label: "API key", secret: true },
      { key: "webhookSecret", label: "Webhook signing secret", secret: true },
    ],
    fallback: "Email the factor the invoice PDF", sync: "webhook", status: "stub",
  },
] as const

export type RegisteredProvider = (typeof PROVIDERS)[number]["id"]

export function providerSpec(id: string): ProviderSpec | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

/** Field-key allowlist for the credentials action — derived, never duplicated. */
export function allowedFields(id: string): string[] {
  return providerSpec(id)?.fields.map((f) => f.key) ?? []
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
