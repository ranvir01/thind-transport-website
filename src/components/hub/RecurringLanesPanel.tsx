import Link from "next/link"
import { Repeat } from "lucide-react"
import { WEEKDAY_LABELS, type RecurringLaneOverviewRow } from "@/lib/hub/recurring"
import { linkAccentCls, Panel, Pill } from "@/components/hub/ui"

/**
 * Roll-up of every "rebook weekly" rule on the loads page: which lanes book
 * themselves, on what day, what they last booked — and, front and center, any
 * rule the cron auto-disabled (source load deleted, customer removed) so a
 * stopped lane never goes unnoticed. Rendered only when rules exist; rows
 * link to the load detail page where the rule is edited.
 */
export function RecurringLanesPanel({ rows }: { rows: RecurringLaneOverviewRow[] }) {
  if (rows.length === 0) return null
  return (
    <Panel title="Recurring lanes" className="mb-4">
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const lane =
            row.originCity && row.destCity
              ? `${row.originCity}, ${row.originState} → ${row.destCity}, ${row.destState}`
              : null
          return (
            <li key={row.loadId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 md:px-[18px]">
              <Repeat className="h-3.5 w-3.5 shrink-0 text-fg-3" aria-hidden />
              <Link href={`/hub/loads/${row.loadId}`} className={`font-mono text-sm ${linkAccentCls}`}>
                {row.reference}
              </Link>
              <span className="min-w-0 flex-1 truncate text-sm text-fg-2">
                {lane ?? "Source load no longer available"}
                {row.customerName ? <span className="text-fg-3"> · {row.customerName}</span> : null}
              </span>
              <span className="text-sm text-fg-2">Every {WEEKDAY_LABELS[row.weekday]}</span>
              {row.lastError ? (
                <span className="flex items-center gap-2">
                  <Pill tone="warn">Stopped</Pill>
                  <span className="text-xs text-warn">{row.lastError}</span>
                </span>
              ) : row.lastLoadRef ? (
                <span className="text-xs text-fg-3">
                  Last booked <span className="font-mono">{row.lastLoadRef}</span>
                </span>
              ) : (
                <span className="text-xs text-fg-3">Books next {WEEKDAY_LABELS[row.weekday]}</span>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
