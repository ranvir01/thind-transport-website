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
 * steel = pending.
 */
export function StopTimeline({
  stops,
  className,
  pickupVerified = false,
}: {
  stops: TimelineStop[]
  className?: string
  /** Positive pickup verification (sharelinks.ts) — tags the first pickup stop. */
  pickupVerified?: boolean
}) {
  const firstPickupId = stops.find((s) => s.type === "pickup")?.id
  return (
    <ol className={className ? `space-y-4 ${className}` : "space-y-4"}>
      {stops.map((stop, i) => (
        <li key={stop.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                stop.departed_at
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                  : stop.arrived_at
                    ? "text-[color:var(--portal-accent)]"
                    : "border-white/15 bg-white/5 text-steel-200"
              }`}
              style={
                stop.arrived_at && !stop.departed_at
                  ? {
                      borderColor: "color-mix(in srgb, var(--portal-accent) 40%, transparent)",
                      backgroundColor: "color-mix(in srgb, var(--portal-accent) 15%, transparent)",
                    }
                  : undefined
              }
            >
              {i + 1}
            </span>
            {i < stops.length - 1 ? <span className="w-px flex-1 bg-white/10 my-1" /> : null}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">{stop.type}</p>
            <p className="font-semibold text-white">
              {stop.city}, {stop.state}
              {pickupVerified && stop.id === firstPickupId ? (
                <span
                  data-testid="pickup-verified"
                  className="ml-2 inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-emerald-300"
                >
                  Pickup verified
                </span>
              ) : null}
            </p>
            <p className="text-body-xs text-steel-300">{stopTimingLine(stop)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
