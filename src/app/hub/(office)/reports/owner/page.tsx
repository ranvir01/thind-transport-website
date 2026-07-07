import Link from "next/link"
import { weeklyRevenueTrend, monthlyRevenueTrend, arAgingTrend, type RevenuePeriod, type AgingTrendPeriod } from "@/lib/hub/reports"
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

const AGING_SEGMENTS: { key: keyof AgingTrendPeriod; className: string; label: string }[] = [
  { key: "currentCents", className: "bg-surface-2", label: "Current" },
  { key: "bucket1_30Cents", className: "bg-warn-soft", label: "1-30" },
  { key: "bucket31_60Cents", className: "bg-warn", label: "31-60" },
  { key: "bucket61_90Cents", className: "bg-bad-soft", label: "61-90" },
  { key: "bucket90PlusCents", className: "bg-bad", label: "90+" },
]

function AgingTrendBars({ periods }: { periods: AgingTrendPeriod[] }) {
  const max = Math.max(1, ...periods.map((p) => p.totalOpenCents))
  const weekLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <div>
      <div className="flex items-end gap-2 px-4 pb-2 pt-2" style={{ height: 160 }}>
        {periods.map((p) => (
          <div key={p.periodStart} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10.5px] font-medium text-fg-3 tabular-nums">
              {p.totalOpenCents > 0 ? `$${Math.round(p.totalOpenCents / 100 / 1000)}k` : ""}
            </span>
            <div
              className="flex w-full flex-col-reverse overflow-hidden rounded-t-md"
              title={fmtCents(p.totalOpenCents)}
            >
              {AGING_SEGMENTS.map((seg) => {
                const value = p[seg.key] as number
                if (value <= 0) return null
                return (
                  <div
                    key={seg.key}
                    className={seg.className}
                    style={{ height: Math.max(1, Math.round((value / max) * 110)) }}
                  />
                )
              })}
            </div>
            <span className="text-[10.5px] text-fg-3">{weekLabel(p.periodStart)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-4 text-[10.5px] text-fg-3">
        {AGING_SEGMENTS.map((seg) => (
          <span key={seg.key} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-sm ${seg.className}`} /> {seg.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default async function OwnerDashboardPage() {
  const user = await requirePermissionPage("money:read")
  const [weekly, monthly, aging] = await Promise.all([
    weeklyRevenueTrend(user.carrierId, 8),
    monthlyRevenueTrend(user.carrierId, 6),
    arAgingTrend(user.carrierId, 8),
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

      <div className="mt-4">
        <Panel title="AR aging trend — last 8 weeks">
          <AgingTrendBars periods={aging} />
        </Panel>
      </div>
    </div>
  )
}
