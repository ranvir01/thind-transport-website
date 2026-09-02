import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Empty state for the forced-dark driver/portal surfaces — the office
 * `EmptyState` paints --surface/--fg, which are the LIGHT values here when the
 * stored mode is light (AGENTS.md). Same contract as the office one: a real
 * icon, a headline, one line of help, and a CTA whenever there is a next step
 * (DESIGN.md: "Never a bare —").
 */
export function EmptyStateDark({
  title,
  hint,
  action,
  icon,
  className,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("driver-card driver-card--well px-6 py-10 text-center", className)}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-card bg-white/[0.06] text-steel-300">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-base font-semibold text-white">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-sm text-body-sm text-steel-300">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </section>
  )
}
