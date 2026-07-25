import { requireOwner } from "@/lib/hub/session"
import { credentialsConfigured, getCredentials, hasCredentials, type IntegrationProvider } from "@/lib/hub/credentials"
import { fmcsaConfigured } from "@/lib/hub/vetting"
import { aiParserConfigured } from "@/lib/hub/doc-intake/analyze-enhanced"
import { PROVIDERS } from "@/lib/hub/integrations/registry"
import { qboTokenExpiryNotice } from "@/lib/hub/integrations/qbo"
import { EVENT_RETRY_PROVIDERS } from "@/lib/hub/integrations/event-processors"
import { query } from "@/lib/hub/db"
import { PageHeader, Panel } from "@/components/hub/ui"
import { IntegrationCard, type ProviderCard } from "@/components/hub/IntegrationsPanel"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function IntegrationsPage() {
  const user = await requireOwner()
  const [connectedFlags, syncs, pendingEventRows, qboCreds] = await Promise.all([
    Promise.all(PROVIDERS.map((p) => hasCredentials(user.carrierId, p.id as IntegrationProvider))),
    query<{ source: string; started_at: string; ok: boolean | null; counts: unknown; error: string | null }>(
      `SELECT source, started_at, ok, counts, error FROM hub.integration_syncs
       WHERE carrier_id = $1 OR carrier_id IS NULL ORDER BY started_at DESC LIMIT 15`,
      [user.carrierId]
    ),
    query<{ provider: string; count: string }>(
      `SELECT provider, COUNT(*)::text AS count FROM hub.integration_events
       WHERE carrier_id = $1 AND processed_at IS NULL GROUP BY provider`,
      [user.carrierId]
    ),
    // Read (not just existence-check) the QBO payload for the refresh-token
    // expiry the sync persists — only the expiry date reaches the card, never
    // a credential value. Null when unconfigured/disconnected.
    getCredentials(user.carrierId, "qbo"),
  ])
  const pendingEventsByProvider = new Map(pendingEventRows.map((r) => [r.provider, Number(r.count)]))

  // Every card comes from the provider registry — adding a provider there is
  // the whole job; this page never hardcodes a list again.
  const baseUrl = process.env.NEXTAUTH_URL || "https://thindtransport.com"
  const cards: ProviderCard[] = PROVIDERS.map((spec, i) => ({
    provider: spec.id as IntegrationProvider,
    title: spec.label,
    blurb: spec.blurb,
    fallback: spec.fallback,
    fields: [...spec.fields],
    connected: connectedFlags[i],
    // "Sync now" needs a case in runProviderSync (src/app/hub/_actions/integrations.ts) —
    // every registry `sync: "poll"` provider has one (locked by registry.test.ts's
    // cronJob↔sync-kind check); manual-only providers like DAT/Truckstop search
    // on-demand instead, and webhook providers like factor never poll.
    canSync: spec.sync === "poll",
    status: spec.status,
    // Push-style providers get their inbound URL, and so does any poll
    // provider that accepts signed file drops (a `webhookSecret` field in the
    // registry is the marker — e.g. EFS's daily CSV forward).
    webhookUrl:
      spec.sync === "webhook" || spec.fields.some((f) => f.key === "webhookSecret")
        ? `${baseUrl}/api/hub/webhooks/${spec.id}?carrier=${user.carrierId}`
        : undefined,
    // Providers with a webhook event processor get a "retry unprocessed"
    // surface — the set derives from EVENT_PROCESSORS (event-processors.ts).
    pendingEvents: EVENT_RETRY_PROVIDERS.has(spec.id) ? (pendingEventsByProvider.get(spec.id) ?? 0) : undefined,
    // Intuit hard-caps refresh tokens at 5 years — warn on the card before
    // the sync dies unrecoverably instead of after.
    credentialNotice: spec.id === "qbo" ? qboTokenExpiryNotice(qboCreds) ?? undefined : undefined,
  }))

  const pushConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  const envServices = [
    { name: "FMCSA QCMobile (broker vetting)", ok: fmcsaConfigured(), fix: "set FMCSA_WEBKEY" },
    { name: "EIA weekly diesel index", ok: Boolean(process.env.EIA_API_KEY), fix: "set EIA_API_KEY" },
    { name: "Smart Setup AI extraction (Anthropic)", ok: aiParserConfigured(), fix: "set ANTHROPIC_API_KEY" },
    { name: "Driver push notifications (web push)", ok: pushConfigured, fix: "set VAPID keys" },
    { name: "Scheduled jobs (vercel.json cron)", ok: Boolean(process.env.CRON_SECRET), fix: "set CRON_SECRET" },
  ]

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Every feed sits behind an internal interface with the CSV import as the always-working fallback."
      />

      {!credentialsConfigured() ? (
        <p className="mb-4 rounded-xl border border-warn-soft bg-warn-soft px-4 py-3 text-body-sm text-warn">
          Set <code>CREDENTIALS_KEY</code> (32+ random characters) in the environment to enable
          encrypted credential storage. Until then, everything runs on imports — which always work.
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <IntegrationCard key={card.provider} card={card} encryptionReady={credentialsConfigured()} />
        ))}

        {/* Keyed services configured at the environment level, not per carrier */}
        <Panel className="p-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-fg">Environment services</h3>
          <ul className="mt-2 space-y-1.5 text-body-sm">
            {envServices.map((svc) => (
              <li key={svc.name} className="flex items-center justify-between">
                <span className="text-fg-2">{svc.name}</span>
                <span className={cn("text-[11px] font-bold uppercase", svc.ok ? "text-ok" : "text-fg-3")}>
                  {svc.ok ? "configured" : svc.fix}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between">
              <span className="text-fg-2">NWS weather · NHTSA VIN/recalls · OSM</span>
              <span className="text-[11px] font-bold uppercase text-ok">no key needed</span>
            </li>
          </ul>
          <p className="mt-2 text-[11px] text-fg-3">
            Full readiness report: <code>npm run connections:check</code>
          </p>
        </Panel>
      </div>

      {/* Sync history */}
      <h2 className="mt-6 mb-2 text-[13.5px] font-semibold text-fg">Sync history</h2>
      <Panel className="divide-y divide-border">
        {syncs.length === 0 ? (
          <p className="p-4 text-body-sm text-fg-3">No syncs yet.</p>
        ) : (
          syncs.map((sync, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span className="min-w-0 truncate text-fg-2">
                <span className="font-semibold text-fg">{sync.source}</span>
                {" · "}
                {new Date(sync.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {sync.error ? <span className="text-bad"> — {sync.error}</span> : null}
                {sync.counts ? <span className="text-fg-3"> — {JSON.stringify(sync.counts)}</span> : null}
              </span>
              <span className={cn("shrink-0 text-[11px] font-bold uppercase", sync.ok ? "text-ok" : "text-bad")}>
                {sync.ok ? "ok" : "failed"}
              </span>
            </div>
          ))
        )}
      </Panel>
    </div>
  )
}
