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

/**
 * Numbered stop timeline for forced-dark sharelink/portal surfaces:
 * gold badge = arrived, emerald = departed, steel = pending.
 */
export function StopTimeline({ stops, className }: { stops: TimelineStop[]; className?: string }) {
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
                    ? "border-gold/40 bg-gold/15 text-gold"
                    : "border-white/15 bg-white/5 text-steel-200"
              }`}
            >
              {i + 1}
            </span>
            {i < stops.length - 1 ? <span className="w-px flex-1 bg-white/10 my-1" /> : null}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">{stop.type}</p>
            <p className="font-semibold text-white">{stop.city}, {stop.state}</p>
            <p className="text-body-xs text-steel-300">
              {stop.fcfs ? "FCFS" : stop.appt_start ? `Appt ${fmt(stop.appt_start)}` : ""}
              {stop.arrived_at ? ` · Arrived ${fmt(stop.arrived_at)}` : ""}
              {stop.departed_at ? ` · Departed ${fmt(stop.departed_at)}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
