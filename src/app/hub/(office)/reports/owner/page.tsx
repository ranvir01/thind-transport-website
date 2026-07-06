import Link from "next/link"
import { weeklyRevenueTrend, monthlyRevenueTrend, type RevenuePeriod } from "@/lib/hub/reports"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

function RevenueBars({ periods, labelFmt }: { periods: RevenuePeriod[]; labelFmt: (iso: string) => string }) {
  const max = Math.max(1, ...periods.map((p) => p.revenueCents))
  return (
    <div className="flex items-end gap-2 px-4 pb-4 pt-2" style={{ height: 160 }}>
      {periods.map((p) => (
        <div key={p.periodStart} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10.5px] font-medium text-fg-3 tabular-nums">
            {p.revenueCents > 0 ? `$${Math.round(p.revenueCents / 100 / 1000)}k` : ""}
          </span>
          <div
            className="w-full rounded-t-md bg-accent"
            style={{ height: Math.max(2, Math.round((p.revenueCents / max) * 110)) }}
            title={fmtCents(p.revenueCents)}
          />
          <span className="text-[10.5px] text-fg-3">{labelFmt(p.periodStart)}</span>
        </div>
      ))}
    </div>
  )
}

export default async function OwnerDashboardPage() {
  const user = await requirePermissionPage("money:read")
  const [weekly, monthly] = await Promise.all([
    weeklyRevenueTrend(user.carrierId, 8),
    monthlyRevenueTrend(user.carrierId, 6),
  ])

  const weekLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const monthLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short" })

  return (
    <div>
      <PageHeader
        title="Owner Dashboard"
        subtitle="Revenue, cost, and lane performance at a glance — the numbers an owner checks first."
        action={
          <Link
            href="/hub/reports"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
          >
            Full P&amp;L &amp; lanes →
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Revenue — last 8 weeks">
          <RevenueBars periods={weekly} labelFmt={weekLabel} />
        </Panel>
        <Panel title="Revenue — last 6 months">
          <RevenueBars periods={monthly} labelFmt={monthLabel} />
        </Panel>
      </div>
    </div>
  )
}
