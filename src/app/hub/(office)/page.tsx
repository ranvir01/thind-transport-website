import Link from "next/link"
import { Package, TruckIcon, Users, AlertTriangle } from "lucide-react"
import { getDashboardStats, listExpiringItems, listLoads } from "@/lib/hub/loads"
import { formatMoney, loadTotal } from "@/lib/hub/types"
import { Panel, PageHeader, StatusBadge, ExpiryPill, EmptyState } from "@/components/hub/ui"
import { requireOfficeUser } from "@/lib/hub/session"

export const dynamic = "force-dynamic"

export default async function HubDashboardPage() {
  const user = await requireOfficeUser()
  const [stats, expiring, recentLoads] = await Promise.all([
    getDashboardStats(),
    listExpiringItems(60),
    listLoads({ status: "active" }),
  ])

  const kpis = [
    { label: "Active loads", value: stats.active_loads, icon: Package, href: "/hub/dispatch" },
    { label: "In transit", value: stats.in_transit, icon: TruckIcon, href: "/hub/dispatch" },
    { label: "Awaiting POD", value: stats.awaiting_pod, icon: Package, href: "/hub/dispatch" },
    { label: "Active drivers", value: stats.drivers_active, icon: Users, href: "/hub/drivers" },
  ]

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`}
        subtitle="Here's where the fleet stands right now."
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <Panel className="p-4 hover:border-white/20 transition-colors h-full">
              <div className="flex items-center justify-between">
                <span className="text-label text-steel-300 uppercase">{kpi.label}</span>
                <kpi.icon className="h-4 w-4 text-steel-400" />
              </div>
              <p className="mt-2 font-display text-3xl font-extrabold text-gold">{kpi.value}</p>
            </Panel>
          </Link>
        ))}
      </div>

      {/* Revenue + fleet status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Panel className="p-4">
          <span className="text-label text-steel-300 uppercase">Booked revenue · this week</span>
          <p className="mt-2 font-display text-2xl font-extrabold text-white">{formatMoney(stats.revenue_week)}</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-steel-300 uppercase">Booked revenue · this month</span>
          <p className="mt-2 font-display text-2xl font-extrabold text-white">{formatMoney(stats.revenue_month)}</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-steel-300 uppercase">Trucks ready</span>
          <p className="mt-2 font-display text-2xl font-extrabold text-white">
            {stats.trucks_active}<span className="text-steel-400 text-lg"> / {stats.trucks_total}</span>
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent active loads */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">Active loads</h2>
            <Link href="/hub/loads" className="text-body-sm text-gold hover:text-gold-300 font-semibold">
              View all →
            </Link>
          </div>
          {recentLoads.length === 0 ? (
            <EmptyState
              title="No active loads"
              hint="Book your first load to get the board moving."
              action={
                <Link
                  href="/hub/loads/new"
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400"
                >
                  New load
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {recentLoads.slice(0, 8).map((load) => (
                <Link key={load.id} href={`/hub/loads/${load.id}`} className="block">
                  <Panel className="p-3.5 hover:border-white/20 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">{load.reference}</span>
                          <StatusBadge status={load.status} />
                        </div>
                        <p className="text-body-sm text-steel-200 mt-1 truncate">
                          {load.origin_city ? `${load.origin_city}, ${load.origin_state}` : "—"}
                          {" → "}
                          {load.dest_city ? `${load.dest_city}, ${load.dest_state}` : "—"}
                          {load.customer_name ? ` · ${load.customer_name}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display font-extrabold text-gold">{formatMoney(loadTotal(load))}</p>
                        <p className="text-body-xs text-steel-300">{load.driver_name ?? "Unassigned"}</p>
                      </div>
                    </div>
                  </Panel>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Compliance: expiring soon */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">Expiring in 60 days</h2>
          </div>
          {expiring.length === 0 ? (
            <Panel className="p-5 text-center">
              <p className="text-body-sm text-steel-200">Nothing expiring. The fleet is clean.</p>
            </Panel>
          ) : (
            <Panel className="divide-y divide-white/5">
              {expiring.map((item, i) => (
                <Link key={i} href={item.href} className="flex items-center justify-between gap-2 p-3 hover:bg-white/5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <p className="text-body-xs text-steel-300">{item.kind}</p>
                  </div>
                  <ExpiryPill date={item.due} />
                </Link>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
