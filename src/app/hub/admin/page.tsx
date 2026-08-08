import { requirePlatformAdmin } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { PRODUCT } from "@/lib/hub/product"
import {
  computeSaasMonth,
  simulateBillingFromTenants,
  SIMULATED_PRICE_PER_TRUCK_CENTS,
} from "@/lib/hub/saas-metrics"
import { Panel } from "@/components/hub/ui"
import { SignOutButton } from "@/components/hub/SignOutButton"
import { TenantActions } from "@/components/hub/TenantActions"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/**
 * Platform admin (Phase 7): tenant list + operational counts only.
 * No customer business data — suspend/reactivate and metrics, nothing else.
 */
export default async function PlatformAdminPage() {
  await requirePlatformAdmin()

  const tenants = await query<{
    id: string; name: string; dot_number: string | null; status: string; created_at: string
    users: string; trucks: string; loads_30d: string
  }>(
    `SELECT c.id, c.name, c.dot_number, c.status, c.created_at,
       (SELECT COUNT(*) FROM hub.users u WHERE u.carrier_id = c.id) AS users,
       (SELECT COUNT(*) FROM hub.trucks t WHERE t.carrier_id = c.id AND t.deleted_at IS NULL) AS trucks,
       (SELECT COUNT(*) FROM hub.loads l WHERE l.carrier_id = c.id AND l.created_at >= NOW() - INTERVAL '30 days') AS loads_30d
     FROM hub.carriers c ORDER BY c.created_at`
  )

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="brand-wordmark text-xl font-semibold text-white tracking-[0.14em]">
              {PRODUCT.wordmark}
            </span>
            <span className="ml-3 text-[10px] font-bold uppercase tracking-[0.25em] text-fg-3">
              Platform admin
            </span>
          </div>
          <div className="w-40">
            <SignOutButton variant="dark" />
          </div>
        </div>

        <p className="mb-4 text-body-sm text-fg-2">
          Tenants and operational counts only — customer business data stays inside each workspace.
        </p>

        <SaasMetricsPanel tenants={tenants} />

        <Panel className="divide-y divide-border">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-fg">
                  {tenant.name}
                  {tenant.dot_number ? <span className="text-fg-3 font-normal"> · DOT {tenant.dot_number}</span> : null}
                </p>
                <p className="text-body-xs text-fg-3">
                  {tenant.users} user(s) · {tenant.trucks} truck(s) · {tenant.loads_30d} load(s) last 30d ·
                  since {new Date(tenant.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                    tenant.status === "active"
                      ? "border-ok-soft bg-ok-soft text-ok"
                      : "border-bad-soft bg-bad-soft text-bad"
                  )}
                >
                  {tenant.status}
                </span>
                <TenantActions tenantId={tenant.id} status={tenant.status} />
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}

/**
 * Business metrics over SIMULATED billing (per-truck list price applied to
 * the real tenant list) — the header badge says so, loudly. NRR/churn/Rule
 * of 40 render only when enough history exists, per the metric definitions
 * in saas-metrics.ts; a two-tenant platform showing "100% NRR" as if it
 * meant something would be exactly the fake-KPI theater this avoids.
 */
function SaasMetricsPanel({
  tenants,
}: {
  tenants: { id: string; status: string; created_at: string; trucks: string }[]
}) {
  const month = new Date().toISOString().slice(0, 7)
  const rows = simulateBillingFromTenants(
    tenants.map((t) => ({
      carrierId: t.id,
      createdAt: new Date(t.created_at).toISOString(),
      trucks: Number(t.trucks) || 0,
      active: t.status === "active",
    })),
    month
  )
  const m = computeSaasMonth(rows, month)
  const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`

  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: "MRR", value: dollars(m.mrrCents), hint: `${m.billedLogos} carrier(s)` },
    { label: "Trucks billed", value: String(m.billedTrucks), hint: `${dollars(SIMULATED_PRICE_PER_TRUCK_CENTS)}/truck list` },
    {
      label: "Per-truck ARPU",
      value: m.arpuPerTruckCents != null ? dollars(m.arpuPerTruckCents) : "—",
    },
    { label: "NRR", value: m.nrrPct != null ? `${m.nrrPct}%` : "—", hint: m.nrrPct == null ? "needs 2 months" : undefined },
    { label: "Logo churn", value: m.logoChurnPct != null ? `${m.logoChurnPct}%` : "—" },
    { label: "Rule of 40", value: m.ruleOf40 != null ? String(m.ruleOf40) : "—", hint: m.ruleOf40 == null ? "needs 13 months" : undefined },
  ]

  return (
    <Panel className="mb-4 p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-body-sm font-semibold text-fg">Business metrics · {month}</h2>
        <span className="rounded-full border border-warn-soft bg-warn-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warn">
          Simulated billing
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-control border border-border bg-surface-2 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">{t.label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-fg">{t.value}</p>
            {t.hint && <p className="text-[10px] text-fg-3">{t.hint}</p>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-body-xs text-fg-3">
        Real tenants, real truck counts, pretend payments — swaps to Stripe invoices unchanged when
        billing goes live. Definitions pinned in <code>src/lib/hub/saas-metrics.ts</code>.
      </p>
    </Panel>
  )
}
