import Link from "next/link"
import { ChevronLeft, ChevronRight, Route } from "lucide-react"
import { requirePermissionPage } from "@/lib/hub/session"
import { plannerData, weekStartOf } from "@/lib/hub/planner"
import { fmtCents } from "@/lib/hub/types"
import { PageHeader, Panel } from "@/components/hub/ui"
import { PlannerGrid } from "@/components/hub/PlannerGrid"

export const dynamic = "force-dynamic"

function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00`)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const user = await requirePermissionPage("loads:read")
  const { week } = await searchParams
  const data = await plannerData(user.carrierId, week)
  const thisWeek = weekStartOf(new Date()).toISOString().slice(0, 10)
  const weekLabel = new Date(`${data.weekStart}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })

  return (
    <div>
      <PageHeader
        title="Planner"
        subtitle="A truck's whole week at a glance. Drag loads to assign or reschedule — rules apply themselves."
        action={
          <div className="flex items-center gap-1">
            <Link
              href={`/hub/planner?week=${shiftWeek(data.weekStart, -1)}`}
              aria-label="Previous week"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong text-fg-2 hover:bg-hover"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <Link
              href={data.weekStart === thisWeek ? "/hub/planner" : `/hub/planner?week=${thisWeek}`}
              className="flex min-h-[44px] items-center rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              Week of {weekLabel}
            </Link>
            <Link
              href={`/hub/planner?week=${shiftWeek(data.weekStart, 1)}`}
              aria-label="Next week"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong text-fg-2 hover:bg-hover"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        }
      />

      <PlannerGrid
        days={data.days}
        trucks={data.trucks}
        blocks={data.blocks}
        unassigned={data.unassigned}
        timeOff={data.timeOff}
      />

      {/* Backhaul hints */}
      {data.backhaul.length > 0 ? (
        <Panel className="mt-4 p-4 md:p-5">
          <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-1">
            <Route className="h-4 w-4 text-accent-text" /> Backhaul ideas
          </h2>
          <p className="text-body-xs text-fg-3 mb-3">
            Where these trucks go empty, here&apos;s what has paid out of that market before — best margin first.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.backhaul.map((hint) => (
              <div key={hint.truckUnit} className="rounded-xl border border-border bg-white/[0.03] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent-text">
                  #{hint.truckUnit} · empty in {hint.market}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {hint.lanes.map((lane) => (
                    <li key={lane.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-fg-2 truncate">
                        {lane.origin_city} → {lane.dest_city}, {lane.dest_state}
                        <span className="text-fg-3"> · {lane.loads_count}×</span>
                      </span>
                      <span className="shrink-0 font-mono font-medium text-accent-text tabular-nums">
                        {lane.avg_rpm_cents ? `$${(lane.avg_rpm_cents / 100).toFixed(2)}/mi` : fmtCents(lane.margin_cents)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/hub/loads/new"
                  className="mt-2 inline-flex text-body-xs font-semibold text-accent-text hover:underline"
                >
                  Book something like this →
                </Link>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <p className="mt-3 text-body-xs text-fg-3">
        Drive-time forecasts are estimates from the last known position — the ELD is always the authority.
        Striped gold days are approved driver time off; dispatch can&apos;t book over them.
      </p>
    </div>
  )
}
