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
  domain:
    | "telematics" | "loadboard" | "fuel" | "accounting" | "factoring" | "docs"
    | "tolls" | "bypass" | "maintenance" | "safety" | "edi" | "banking"
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
      { key: "actingUserEmail", label: "Acting user email (needs a Connexion + load board seat)" },
    ],
    fallback: "Paste rate con", sync: "manual", status: "stub",
  },
  {
    id: "truckstop", label: "Truckstop.com", domain: "loadboard",
    blurb: "Second load board — SOAP/XML Load Search web service (not a REST API key). Requires a signed Systems Integration Agreement — ask your Truckstop account manager or tsi@truckstop.com — and the Load Board Pro tier.",
    fields: [
      { key: "integrationId", label: "Integration ID (6-digit, issued with the SIA)" },
      { key: "username", label: "Web service username" },
      { key: "password", label: "Web service password", secret: true },
    ],
    fallback: "Paste rate con", sync: "manual", status: "live",
  },
  {
    id: "efs", label: "EFS fuel card", domain: "fuel",
    blurb: "Daily fuel transactions straight into MPG, fraud flags, and fuel→load. Ask your EFS rep for data-feed credentials — the feed arrives as a daily CSV file, which any forwarder can push to your signed file-drop URL below.",
    fields: [
      { key: "feedUser", label: "Feed username" },
      { key: "feedPassword", label: "Feed password", secret: true },
      { key: "webhookSecret", label: "File-drop signing secret (daily CSV forward)", secret: true },
    ],
    fallback: "Fuel statement CSV import", sync: "poll", status: "live", cronJob: "efs-sync",
  },
  {
    id: "wex", label: "WEX fuel card", domain: "fuel",
    blurb: "Same FuelSource contract as EFS — and the same daily-CSV delivery: ask your WEX rep (Data Release Forms) for the feed, then any forwarder can push each day's file to your signed file-drop URL below.",
    fields: [
      { key: "feedUser", label: "Feed username" },
      { key: "feedPassword", label: "Feed password", secret: true },
      { key: "webhookSecret", label: "File-drop signing secret (daily CSV forward)", secret: true },
    ],
    fallback: "Fuel statement CSV import", sync: "poll", status: "live", cronJob: "wex-sync",
  },
  {
    id: "comdata", label: "Comdata fuel card", domain: "fuel",
    blurb: "Same FuelSource contract as EFS. Comdata (Corpay) has real machine channels — ask your account team for API/web-services access, or have any forwarder push the daily transaction file to your signed file-drop URL below.",
    fields: [
      { key: "apiKey", label: "API key", secret: true },
      { key: "apiSecret", label: "API secret", secret: true },
      { key: "webhookSecret", label: "File-drop signing secret (daily file forward)", secret: true },
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
    fallback: "QuickBooks CSV export", sync: "poll", status: "live", cronJob: "qbo-sync",
  },
  {
    id: "factor", label: "Factoring company", domain: "factoring",
    blurb: "Submit factored invoices electronically; track advances and reserves. Pushes events to your webhook URL below.",
    fields: [
      { key: "apiKey", label: "API key", secret: true },
      { key: "subscriptionKey", label: "Subscription key (OTR/Azure APIM — leave blank if your factor doesn't issue one)", secret: true },
      { key: "webhookSecret", label: "Webhook signing secret", secret: true },
    ],
    fallback: "Email the factor the invoice PDF", sync: "webhook", status: "stub",
  },

  // ---- Universal-coverage wave (2026-08 integration research) ----------------
  // All stub-first: the card renders, credentials can be pasted, and the mock
  // adapter satisfies the contract suite — no client goes live until the
  // matching human-action-queue step (account signup / signed agreement /
  // credential paste) is done. See docs/OWNER-CHECKLIST.md.
  {
    id: "axle", label: "Axle (telematics aggregator)", domain: "telematics",
    blurb: "Third ELD aggregator alongside Terminal and TruckerCloud — one more path to a long-tail ELD before falling back to the FMCSA output file. Sign up at withaxle.com.",
    fields: [{ key: "apiKey", label: "Axle API key", secret: true }],
    fallback: "FMCSA ELD output-file upload, or positions CSV import", sync: "poll", status: "stub", cronJob: "telematics-sync",
  },
  {
    id: "atob", label: "AtoB fuel card", domain: "fuel",
    blurb: "API-era fuel card on Visa/Mastercard rails — transaction feed straight into MPG, fraud flags, and fuel→load. Ask AtoB for API access (atob.com).",
    fields: [{ key: "apiKey", label: "AtoB API key", secret: true }],
    fallback: "Fuel statement CSV import", sync: "poll", status: "stub", cronJob: "universal-sync",
  },
  {
    id: "plaid", label: "Plaid (bank feed)", domain: "banking",
    blurb: "The universal fuel-spend fallback: when a card issuer has no feed at all, pull the fuel transactions off the bank statement instead. Needs Plaid production keys (dashboard.plaid.com).",
    fields: [
      { key: "clientId", label: "Plaid client ID" },
      { key: "secret", label: "Plaid secret", secret: true },
      { key: "accessToken", label: "Item access token (per linked account)", secret: true },
    ],
    fallback: "Bank statement CSV import", sync: "poll", status: "stub", cronJob: "universal-sync",
  },
  {
    id: "bestpass", label: "Bestpass tolls", domain: "tolls",
    blurb: "Toll transactions and transponder management over Bestpass's REST API — tolls land as per-truck expenses instead of a monthly surprise. Partner signup at developer.bestpass.com.",
    fields: [
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client secret", secret: true },
    ],
    fallback: "Toll statement CSV import", sync: "poll", status: "stub", cronJob: "universal-sync",
  },
  {
    id: "prepass", label: "PrePass", domain: "bypass",
    blurb: "Weigh-station bypass + toll data (developer.prepass.com; an FTP feed also exists). Bypass events and toll charges per truck.",
    fields: [{ key: "apiKey", label: "PrePass API key", secret: true }],
    fallback: "Toll/bypass statement CSV import", sync: "poll", status: "stub", cronJob: "universal-sync",
  },
  {
    id: "drivewyze", label: "Drivewyze", domain: "bypass",
    blurb: "Weigh-station bypass via the Vehicle Management API (developer.drivewyze.com) — rides on the ELD you already run (80+ providers supported).",
    fields: [{ key: "apiKey", label: "VMAPI key", secret: true }],
    fallback: "No feed — bypass still works in-cab; nothing to import", sync: "manual", status: "stub",
  },
  {
    id: "fleetio", label: "Fleetio maintenance", domain: "maintenance",
    blurb: "Two-way maintenance sync: service reminders and work orders (developer.fleetio.com, 20 req/min). LoadOff's own maintenance panel keeps working without it.",
    fields: [
      { key: "apiToken", label: "API token", secret: true },
      { key: "accountToken", label: "Account token" },
    ],
    fallback: "Built-in maintenance panel + CSV import", sync: "poll", status: "stub", cronJob: "universal-sync",
  },
  {
    id: "sambasafety", label: "SambaSafety MVR monitoring", domain: "safety",
    blurb: "Continuous MVR monitoring — a driver's license status change surfaces in compliance instead of at renewal time. Driver-risk API at developer.sambasafety.com.",
    fields: [
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client secret", secret: true },
    ],
    fallback: "Annual MVR pull, filed to the driver's DQ file", sync: "poll", status: "stub", cronJob: "universal-sync",
  },
  {
    id: "stedi", label: "Stedi EDI gateway", domain: "edi",
    blurb: "EDI-as-API: receive 204 load tenders and send 990/214/210 as JSON — serve enterprise shippers without a VAN. Usage-priced account at stedi.com.",
    fields: [{ key: "apiKey", label: "Stedi API key", secret: true }],
    fallback: "Email/portal tender handling + manual load entry", sync: "webhook", status: "stub",
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
