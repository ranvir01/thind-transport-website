import { MapPin, Navigation, Route } from "lucide-react"
import { MARKET_DATA } from "@/lib/market-data"

/**
 * The corridors we actually run, as one dense-data island (DIRECTION.md §3,
 * archetype C): a header row from md up, one row per lane, miles in mono.
 *
 * Server component. The old "use client" existed only for a Card import;
 * eight rows of static data need no JavaScript.
 */

const ROUTE_NAMES: Record<string, string> = {
  "sea-la": "I-5 Corridor",
  "sea-chi": "I-90 Transcontinental",
  "tac-slc": "I-84 Mountain Route",
  "kent-den": "I-90/I-25 Mountain",
  "sea-sf": "I-5 Pacific Route",
  "pdx-las": "US-95/I-15 Desert",
  "spk-msp": "I-90 Northern",
  "kent-phx": "I-5/I-10 Corridor",
}

const EYEBROW = "font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2"
const COLUMNS = "md:grid-cols-[2fr_2fr_auto_auto]"

export function RouteMapVisualization() {
  const majorLanes = MARKET_DATA.hotLanes.map((lane) => ({
    id: lane.id,
    route: ROUTE_NAMES[lane.id] || `${lane.from} to ${lane.to}`,
    from: lane.from.split(",")[0],
    to: lane.to.split(",")[0],
    distance: `${lane.distance.toLocaleString("en-US")} mi`,
    frequency: lane.frequency,
    type: lane.type,
  }))

  return (
    <div className="rounded-m-3 border border-ink/15 bg-paper p-6 text-ink">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal/10">
          <Route className="h-5 w-5 text-signal" aria-hidden />
        </span>
        <div>
          <h2 id="corridors-heading" className="font-display text-m-h3 font-bold text-ink">
            Major freight corridors
          </h2>
          <p className="mt-1 max-w-measure text-m-body text-ink-2">
            Primary shipping lanes we actually run — not a live load board.
          </p>
        </div>
      </div>

      {/* Column headers are desktop-only: each row carries its own labels on
          a phone, where a header row would have scrolled away. */}
      <div className={`mt-6 hidden gap-x-4 border-b border-ink/15 pb-2 md:grid ${COLUMNS}`}>
        <span className={EYEBROW}>Corridor</span>
        <span className={EYEBROW}>Lane</span>
        <span className={`${EYEBROW} md:text-right`}>Miles</span>
        <span className={`${EYEBROW} md:text-right`}>Frequency</span>
      </div>

      <ul className="mt-6 list-none text-ink md:mt-0">
        {majorLanes.map((lane) => (
          <li
            key={lane.id}
            className={`mb-0 grid grid-cols-1 gap-x-4 gap-y-1 border-b border-ink/10 py-3 md:items-baseline md:py-4 ${COLUMNS}`}
          >
            <span className="flex flex-col">
              <span className={EYEBROW}>{lane.type}</span>
              <span className="text-m-body font-semibold text-ink">{lane.route}</span>
            </span>
            <span className="flex items-center gap-2 text-m-body text-ink-2">
              <MapPin className="h-4 w-4 shrink-0 text-signal" aria-hidden />
              <span>{lane.from}</span>
              <Navigation className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
              <span>{lane.to}</span>
            </span>
            <span className="font-mono text-m-body tabular-nums text-ink md:text-right">{lane.distance}</span>
            <span className="text-m-body text-ink-2 md:text-right">{lane.frequency}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
