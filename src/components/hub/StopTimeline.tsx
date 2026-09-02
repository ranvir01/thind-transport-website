/**
 * Minimal stop shape the timeline renders. Both the public /track/[token] page
 * (full `Stop`) and the portal load detail (`PortalStop`) satisfy it structurally,
 * so neither query layer needs to import the other's type.
 */
export interface TimelineStop {
  id: string
  type: string
  city: string
  state: string
  fcfs: boolean
  appt_start: string | null
  arrived_at: string | null
  departed_at: string | null
}

function fmt(value: string): string {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

/** Timing line under a stop: FCFS/appt, then arrived/departed — only the parts that apply, never a stray leading separator. */
export function stopTimingLine(stop: TimelineStop): string {
  const parts: string[] = []
  if (stop.fcfs) parts.push("FCFS")
  else if (stop.appt_start) parts.push(`Appt ${fmt(stop.appt_start)}`)
  if (stop.arrived_at) parts.push(`Arrived ${fmt(stop.arrived_at)}`)
  if (stop.departed_at) parts.push(`Departed ${fmt(stop.departed_at)}`)
  return parts.join(" · ")
}

/**
 * Numbered stop timeline for forced-dark sharelink/portal surfaces: accent
 * badge (--portal-accent, gold by default) = arrived, emerald = departed,
 * steel = pending. The stop the truck is AT right now (arrived, not yet
 * departed) breathes with an opacity-only pulse so the eye lands on it;
 * reduced-motion users get the static accent badge.
 */
export function StopTimeline({ stops, className }: { stops: TimelineStop[]; className?: string }) {
  return (
    <ol className={className ? `space-y-4 ${className}` : "space-y-4"}>
      {stops.map((stop, i) => {
        const current = Boolean(stop.arrived_at && !stop.departed_at)
        return (
          <li key={stop.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${
                  stop.departed_at
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                    : stop.arrived_at
                      ? "text-[color:var(--portal-accent)] motion-safe:animate-pulse"
                      : "border-white/15 bg-white/5 text-steel-200"
                }`}
                style={
                  current
                    ? {
                        borderColor: "color-mix(in srgb, var(--portal-accent) 40%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--portal-accent) 15%, transparent)",
                      }
                    : undefined
                }
                aria-current={current ? "step" : undefined}
              >
                {i + 1}
              </span>
              {i < stops.length - 1 ? <span className="w-px flex-1 bg-white/10 my-1" /> : null}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">{stop.type}</p>
              <p className="font-semibold text-white">{stop.city}, {stop.state}</p>
              <p className="text-[13px] text-steel-300">{stopTimingLine(stop)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
