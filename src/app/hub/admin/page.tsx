import { redirect } from "next/navigation"
import { getHubUser } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { PRODUCT } from "@/lib/hub/product"
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
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (user.role !== "platform_admin") redirect("/hub")

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
    <div className="min-h-screen bg-navy px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="brand-wordmark text-xl font-semibold text-white tracking-[0.14em]">
              {PRODUCT.wordmark}
            </span>
            <span className="ml-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
              Platform admin
            </span>
          </div>
          <div className="w-40">
            <SignOutButton variant="dark" />
          </div>
        </div>

        <p className="mb-4 text-body-sm text-steel-300">
          Tenants and operational counts only — customer business data stays inside each workspace.
        </p>

        <Panel className="divide-y divide-white/5">
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
