"use client"

/**
 * Lane & transit-time estimator.
 *
 * A shipper's first two questions are "how far" and "when does it land" — and
 * until now this site answered neither without a phone call. This answers both
 * instantly and hands the visitor a pre-filled quote link, which is the whole
 * point: the tool is useful on its own, and being useful is what earns the form
 * submission.
 *
 * Deliberately no price. /quote's own note explains why an instant rate number
 * costs more trust than it buys (lane, volume, accessorials and dates all move
 * it) — so this stays on the two things geometry and the hours-of-service rules
 * can actually settle.
 *
 * Renders as one paper island on the dark page ground (DIRECTION.md §3,
 * archetype C): the inputs on the left, a hairline-framed instrument on the
 * right with mono tabular figures, one red action at the bottom.
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock, MapPin, Repeat, Route, Truck } from "lucide-react"
import {
  FREIGHT_MARKETS,
  ROAD_CIRCUITY,
  greatCircleMiles,
  transitDays,
  type FreightMarket,
} from "@/lib/lane-data"
import { MARKET_DATA } from "@/lib/market-data"
import { COMPANY_INFO } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { inputVariants } from "@/components/ui/input"
import { CountUp } from "@/components/shared/CountUp"

const EQUIPMENT = [
  {
    id: "flatbed",
    label: "Flatbed",
    note: "Add roughly an hour at pickup for securement and tarping — it's built into the slow end of the window below.",
  },
  {
    id: "reefer",
    label: "Reefer",
    note: "Continuous temperature monitoring runs the whole lane; set-point and pre-cool instructions travel with the load.",
  },
  {
    id: "dryVan",
    label: "Dry Van",
    note: "Standard palletized and floor-loaded freight. Dock-to-dock, no accessorial time assumed.",
  },
] as const

type EquipmentId = (typeof EQUIPMENT)[number]["id"]

const marketByLabel = new Map(FREIGHT_MARKETS.map((m) => [m.label, m]))

/** Lanes we already run: use the measured driving distance, not the estimate. */
function knownLane(from: string, to: string) {
  return MARKET_DATA.hotLanes.find(
    (l) => (l.from === from && l.to === to) || (l.from === to && l.to === from)
  )
}

/** Eyebrow labels: the one sanctioned use of caps below 14px — group captions
 *  and instrument readout captions only, never a field's own label. ink-2, not
 *  ink-3 — ink-3 only clears AA at 14px and up, and m-micro is under that. */
const EYEBROW = "font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2"
/** A <legend> names a group of controls, so it takes the eyebrow (the grammar
 *  ProfitCalculator's Equipment legend already uses). */
const LEGEND = `mb-1.5 block ${EYEBROW}`
/** A field label is not an eyebrow: sentence-case body weight, matching the
 *  quote form's labels so both widgets read as one form on /quote. */
const LABEL = "mb-1.5 block text-m-body font-semibold text-ink"

// Native <select>, not the Radix listbox: value/onChange drive the memo, and
// thirty markets read better in the OS picker on a phone. The class string is
// the Input primitive's own, retinted for paper — twMerge swaps the neutral
// tokens for ink, so no `bg-white` is left for the page shell to remap.
const SELECT = cn(inputVariants(), "border-ink/20 bg-paper text-ink shadow-none hover:border-ink/40")

export function LaneTransitEstimator({ className }: { className?: string }) {
  const [origin, setOrigin] = useState("Kent, WA")
  const [destination, setDestination] = useState("Denver, CO")
  const [equipment, setEquipment] = useState<EquipmentId>("dryVan")

  const result = useMemo(() => {
    const a = marketByLabel.get(origin) as FreightMarket
    const b = marketByLabel.get(destination) as FreightMarket
    if (!a || !b || origin === destination) return null

    const lane = knownLane(origin, destination)
    const estimated = Math.round(greatCircleMiles(a, b) * ROAD_CIRCUITY)
    const miles = lane ? lane.distance : estimated
    const { fast, slow } = transitDays(miles)

    return {
      miles,
      measured: Boolean(lane),
      lane,
      driveHours: Math.round(miles / 55),
      fast,
      slow,
      // Over ~1,100 miles a solo driver needs a 10-hour reset; that's the
      // honest reason a two-day lane isn't a one-day lane.
      resets: Math.max(0, fast - 1),
    }
  }, [origin, destination])

  const equipmentMeta = EQUIPMENT.find((e) => e.id === equipment)!
  const laneString = `${origin} → ${destination} (${equipmentMeta.label})`
  const quoteHref = `/quote?lane=${encodeURIComponent(laneString)}`

  return (
    <div className={cn("rounded-m-3 border border-ink/15 bg-paper p-6 text-ink", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal/10">
          <Route className="h-5 w-5 text-signal" aria-hidden />
        </span>
        <div>
          <h3 className="font-display text-m-h4 font-bold text-ink">Lane &amp; transit-time estimator</h3>
          <p className="mt-1 max-w-measure text-m-body text-ink-2">
            Practical driving miles and a realistic delivery window, under real hours-of-service rules.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor="lane-origin" className={LABEL}>
              Picking up in
            </label>
            <select
              id="lane-origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className={SELECT}
            >
              {FREIGHT_MARKETS.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lane-destination" className={LABEL}>
              Delivering to
            </label>
            <select
              id="lane-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={SELECT}
            >
              {FREIGHT_MARKETS.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className={LEGEND}>Equipment</legend>
            <div className="grid grid-cols-3 gap-2">
              {EQUIPMENT.map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => setEquipment(eq.id)}
                  aria-pressed={equipment === eq.id}
                  // The pressed key is ink, not red: the red on this island is
                  // the one action below, and a filled red toggle beside it
                  // would be a second one in the same viewport.
                  className={cn(
                    "min-h-[44px] rounded-fleet border px-3 py-2 text-m-body font-semibold transition-colors duration-fast ease-entrance",
                    equipment === eq.id
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/20 bg-paper text-ink-2 hover:border-ink/40 hover:text-ink"
                  )}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* The instrument: hairline frame, mono figures (DIRECTION.md §4).
            The CountUp figures are keyed on their own value: CountUp seeds its
            display with useState and bails out of the effect under
            prefers-reduced-motion, so without a remount it would keep showing
            the previous lane's miles after the visitor changes markets. */}
        <div className="rounded-m-2 border border-ink/15 p-5">
          {result ? (
            <>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className={EYEBROW}>Driving miles</p>
                  <p className="mt-1 font-mono text-m-h2 font-bold tabular-nums text-ink">
                    <CountUp key={result.miles} value={result.miles} />
                  </p>
                  <p className="mt-1 text-m-micro text-ink-2">
                    {result.measured ? "Measured — we run this lane" : "Estimated ±5%"}
                  </p>
                </div>
                <div>
                  <p className={EYEBROW}>Transit</p>
                  <p className="mt-1 font-mono text-m-h2 font-bold tabular-nums text-ink">
                    {result.fast === result.slow ? (
                      <>
                        <CountUp key={result.fast} value={result.fast} />
                        <span className="ml-1 font-sans text-m-body font-semibold text-ink-2">
                          {result.fast > 1 ? "days" : "day"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>{`${result.fast}–${result.slow}`}</span>
                        <span className="ml-1 font-sans text-m-body font-semibold text-ink-2">days</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-m-micro text-ink-2">Door to door, solo driver</p>
                </div>
              </div>

              <dl className="mt-5 space-y-2.5 border-t border-ink/10 pt-5 text-m-body">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-ink-2">
                    <Clock className="h-4 w-4 text-ink-3" aria-hidden />
                    <span>Wheel time</span>
                  </dt>
                  <dd className="font-mono font-semibold tabular-nums text-ink">{`~${result.driveHours} hrs`}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-ink-2">
                    <Truck className="h-4 w-4 text-ink-3" aria-hidden />
                    <span>10-hr resets required</span>
                  </dt>
                  <dd className="font-mono font-semibold tabular-nums text-ink">{result.resets}</dd>
                </div>
                {result.lane ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-ink-2">
                      <Repeat className="h-4 w-4 text-ink-3" aria-hidden />
                      <span>We run it</span>
                    </dt>
                    <dd className="font-semibold text-ink">{result.lane.frequency}</dd>
                  </div>
                ) : null}
              </dl>

              <p className="mt-5 rounded-m-2 bg-ink/5 p-3 text-m-micro leading-relaxed text-ink-2">
                {equipmentMeta.note}
              </p>

              <Button asChild size="lg" className="mt-5 w-full">
                <Link href={quoteHref}>
                  Quote this lane
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <p className="mt-3 text-center text-m-body text-ink-2">
                <span>Or call dispatch: </span>
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="font-semibold text-ink underline-offset-4 hover:underline"
                >
                  <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                </a>
              </p>
            </>
          ) : (
            <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
              <MapPin className="h-8 w-8 text-ink-3" aria-hidden />
              <p className="mt-3 text-m-body text-ink-2">
                Pick two different markets to see miles and transit time.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 border-t border-ink/10 pt-4 text-m-micro leading-relaxed text-ink-2">
        {`Estimates, not a rate confirmation. Miles are practical driving miles (great-circle × road factor ${ROAD_CIRCUITY}) except on lanes we already run weekly, where the measured distance is used. Transit assumes one solo driver under 11-hour hours-of-service rules — team service and expedited windows are available, ask dispatch.`}
      </p>
    </div>
  )
}
