import { requireOwner } from "@/lib/hub/session"
import { credentialsConfigured, hasCredentials } from "@/lib/hub/credentials"
import { fmcsaConfigured } from "@/lib/hub/vetting"
import { query } from "@/lib/hub/db"
import { PageHeader, Panel } from "@/components/hub/ui"
import { IntegrationCard, type ProviderCard } from "@/components/hub/IntegrationsPanel"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function IntegrationsPage() {
  const user = await requireOwner()
  const [terminal, dat, efs, comdata, mailbox, syncs] = await Promise.all([
    hasCredentials(user.carrierId, "terminal"),
    hasCredentials(user.carrierId, "dat"),
    hasCredentials(user.carrierId, "efs"),
    hasCredentials(user.carrierId, "comdata"),
    hasCredentials(user.carrierId, "mailbox"),
    query<{ source: string; started_at: string; ok: boolean | null; counts: unknown; error: string | null }>(
      `SELECT source, started_at, ok, counts, error FROM hub.integration_syncs
       WHERE carrier_id = $1 OR carrier_id IS NULL ORDER BY started_at DESC LIMIT 15`,
      [user.carrierId]
    ),
  ])

  const cards: ProviderCard[] = [
    {
      provider: "terminal",
      title: "TruckX ELD (via Terminal)",
      blurb: "Live GPS, odometer, and HOS clocks. TruckX connects through the Terminal aggregator — open an account at withterminal.com and authorize TruckX.",
      fallback: "Import → Positions CSV (TruckX portal export) feeds the same tables.",
      fields: [
        { key: "apiKey", label: "Terminal API key", type: "password" },
        { key: "connectionToken", label: "Connection token", type: "password" },
      ],
      connected: terminal,
      canSync: true,
    },
    {
      provider: "dat",
      title: "DAT load board",
      blurb: "One-click book → load. Needs a DAT service account with API entitlement (developer.dat.com; certification required before production).",
      fallback: "Loads → Paste a rate con books a load in under 60 seconds.",
      fields: [
        { key: "serviceAccountEmail", label: "Service account email" },
        { key: "password", label: "Service account password", type: "password" },
      ],
      connected: dat,
    },
    {
      provider: "efs",
      title: "EFS / WEX fuel feed",
      blurb: "Daily transaction feed. Ask your EFS/WEX rep for data-feed credentials (separate from the portal login).",
      fallback: "Import → Fuel CSV handles any program's statement export, idempotently.",
      fields: [
        { key: "feedUser", label: "Feed username" },
        { key: "feedPassword", label: "Feed password", type: "password" },
      ],
      connected: efs,
    },
    {
      provider: "comdata",
      title: "Comdata fuel feed",
      blurb: "Comdata has a developer portal — request API credentials from your account team.",
      fallback: "Import → Fuel CSV handles Comdata statement exports.",
      fields: [
        { key: "apiKey", label: "API key", type: "password" },
        { key: "apiSecret", label: "API secret", type: "password" },
      ],
      connected: comdata,
    },
    {
      provider: "mailbox",
      title: "Docs mailbox (IMAP)",
      blurb: "Forward rate cons to a dedicated address — attachments auto-file to the matching load by reference number in the subject.",
      fallback: "Upload documents on the load page, or paste the rate con text.",
      fields: [
        { key: "host", label: "IMAP host (e.g. imap.gmail.com)" },
        { key: "port", label: "Port (993)" },
        { key: "user", label: "Mailbox user" },
        { key: "password", label: "App password", type: "password" },
      ],
      connected: mailbox,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Every feed sits behind an internal interface with the CSV import as the always-working fallback."
      />

      {!credentialsConfigured() ? (
        <p className="mb-4 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-3 text-body-sm text-gold">
          Set <code>CREDENTIALS_KEY</code> (32+ random characters) in the environment to enable
          encrypted credential storage. Until then, everything runs on imports — which always work.
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <IntegrationCard key={card.provider} card={card} encryptionReady={credentialsConfigured()} />
        ))}

        {/* Free keyed APIs configured at the environment level */}
        <Panel className="p-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">Free government APIs</h3>
          <ul className="mt-2 space-y-1.5 text-body-sm">
            <li className="flex items-center justify-between">
              <span className="text-steel-100">FMCSA QCMobile (broker vetting)</span>
              <span className={cn("text-[11px] font-bold uppercase", fmcsaConfigured() ? "text-green-400" : "text-steel-400")}>
                {fmcsaConfigured() ? "configured" : "set FMCSA_WEBKEY"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-steel-100">EIA weekly diesel index</span>
              <span className={cn("text-[11px] font-bold uppercase", process.env.EIA_API_KEY ? "text-green-400" : "text-steel-400")}>
                {process.env.EIA_API_KEY ? "configured" : "set EIA_API_KEY"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-steel-100">NWS weather · NHTSA VIN/recalls · OSM</span>
              <span className="text-[11px] font-bold uppercase text-green-400">no key needed</span>
            </li>
          </ul>
        </Panel>
      </div>

      {/* Sync history */}
      <h2 className="mt-6 mb-2 font-display text-base font-bold uppercase tracking-wide text-white">Sync history</h2>
      <Panel className="divide-y divide-white/5">
        {syncs.length === 0 ? (
          <p className="p-4 text-body-sm text-steel-300">No syncs yet.</p>
        ) : (
          syncs.map((sync, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span className="min-w-0 truncate text-steel-100">
                <span className="font-semibold text-white">{sync.source}</span>
                {" · "}
                {new Date(sync.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {sync.error ? <span className="text-red-400"> — {sync.error}</span> : null}
                {sync.counts ? <span className="text-steel-400"> — {JSON.stringify(sync.counts)}</span> : null}
              </span>
              <span className={cn("shrink-0 text-[11px] font-bold uppercase", sync.ok ? "text-green-400" : "text-red-400")}>
                {sync.ok ? "ok" : "failed"}
              </span>
            </div>
          ))
        )}
      </Panel>
    </div>
  )
}
