import { currentTestingPeriod, listRandomTestEvents, randomTestingSummary } from "@/lib/hub/random-testing"
import { requirePermissionPage } from "@/lib/hub/session"
import { Panel, PageHeader, BackLink, Pill } from "@/components/hub/ui"
import { RecordResultForm, RunSelectionButton } from "@/components/hub/RandomTestingForms"
import { HelpTip } from "@/components/hub/HelpTip"

export const dynamic = "force-dynamic"

const STATUS_TONE = {
  selected: "warn", notified: "info", completed: "ok", refused: "bad", no_show: "bad",
} as const

export default async function RandomTestingPage() {
  const user = await requirePermissionPage("compliance:read")
  const period = currentTestingPeriod()
  const [summary, events] = await Promise.all([
    randomTestingSummary(user.carrierId, period),
    listRandomTestEvents(user.carrierId, period),
  ])

  return (
    <div>
      <BackLink href="/hub/compliance" label="Compliance" />
      <PageHeader
        title={`Random testing — ${period}`}
        titleExtra={
          <HelpTip title="49 CFR Part 382.305">
            DOT requires randomly selecting CDL-holding drivers for drug and alcohol
            testing each year at or above the rates below, spread through the year —
            not all at once. This page draws one quarter&apos;s pool at a time so four
            quarters sum to the annual rate; running selection again after drivers
            are added tops the pool up, it never re-selects anyone already in it.
            A selected driver must report immediately once notified.
          </HelpTip>
        }
        subtitle="Quarterly random-selection pool, notice, and result log — required for every DOT-regulated driver."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {(["drug", "alcohol"] as const).map((type) => (
          <Panel key={type} className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-label uppercase text-fg-3">{type} testing — {summary[type].pct}% annual rate</span>
            </div>
            <p className="font-display text-2xl font-extrabold text-fg mb-3">
              {summary[type].selected} / {summary[type].targetPoolSize} selected this quarter
            </p>
            <RunSelectionButton testType={type} />
          </Panel>
        ))}
      </div>

      <Panel className="divide-y divide-border">
        {events.length === 0 ? (
          <p className="p-6 text-center text-body-sm text-fg-2">No one selected yet this quarter.</p>
        ) : null}
        {events.map((e) => (
          <div key={e.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg truncate">
                {e.driver_name} — <span className="uppercase">{e.test_type}</span>
              </p>
              <p className="text-body-xs text-fg-3">
                Selected {new Date(e.selected_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {e.notified_at ? " · notified" : ""}
                {e.completed_on
                  ? ` · ${new Date(e.completed_on).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                  : ""}
                {e.result ? ` · ${e.result}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Pill tone={STATUS_TONE[e.status]}>{e.status.replace("_", " ")}</Pill>
              {e.status === "completed" || e.status === "refused" || e.status === "no_show" ? null : (
                <RecordResultForm id={e.id} />
              )}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  )
}
