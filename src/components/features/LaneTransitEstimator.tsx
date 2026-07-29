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

  const selectClass =
    "w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"

  return (
    <div
      className={`overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl ${className ?? ""}`}
    >
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-5 md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600/10">
            <Route className="h-5 w-5 text-orange-600" aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-black text-gray-900">Lane &amp; transit-time estimator</h3>
            <p className="text-sm text-gray-600">
              Practical driving miles and a realistic delivery window, under real hours-of-service rules.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="lane-origin" className="mb-1.5 block text-sm font-bold text-gray-900">
              Picking up in
            </label>
            <select
              id="lane-origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className={selectClass}
            >
              {FREIGHT_MARKETS.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lane-destination" className="mb-1.5 block text-sm font-bold text-gray-900">
              Delivering to
            </label>
            <select
              id="lane-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={selectClass}
            >
              {FREIGHT_MARKETS.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-bold text-gray-900">Equipment</legend>
            <div className="grid grid-cols-3 gap-2">
              {EQUIPMENT.map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => setEquipment(eq.id)}
                  aria-pressed={equipment === eq.id}
                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-bold transition-all duration-fast ease-entrance motion-safe:active:scale-[0.98] ${
                    equipment === eq.id
                      ? "border-orange-600 bg-orange-600 text-white shadow-cta"
                      : "border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:text-orange-600"
                  }`}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="rounded-2xl bg-[#0F1013] p-6 text-white">
          {result ? (
            <>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">
                    Driving miles
                  </p>
                  <p className="mt-1 font-mono text-3xl font-black text-orange-400">
                    <CountUp value={result.miles} />
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    {result.measured ? "Measured — we run this lane" : "Estimated ±5%"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">
                    Transit
                  </p>
                  <p className="mt-1 font-mono text-3xl font-black">
                    {result.fast === result.slow ? (
                      <>
                        <CountUp value={result.fast} />
                        <span className="text-lg font-bold"> day{result.fast > 1 ? "s" : ""}</span>
                      </>
                    ) : (
                      <>
                        {result.fast}–{result.slow}
                        <span className="text-lg font-bold"> days</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-white/60">Door to door, solo driver</p>
                </div>
              </div>

              <dl className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-white/70">
                    <Clock className="h-4 w-4 text-white/40" aria-hidden /> Wheel time
                  </dt>
                  <dd className="font-mono font-bold tabular-nums">~{result.driveHours} hrs</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-white/70">
                    <Truck className="h-4 w-4 text-white/40" aria-hidden /> 10-hr resets required
                  </dt>
                  <dd className="font-mono font-bold tabular-nums">{result.resets}</dd>
                </div>
                {result.lane ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-white/70">
                      <Repeat className="h-4 w-4 text-white/40" aria-hidden /> We run it
                    </dt>
                    <dd className="font-bold text-green-400">{result.lane.frequency}</dd>
                  </div>
                ) : null}
              </dl>

              <p className="mt-5 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/70">
                {equipmentMeta.note}
              </p>

              <Link
                href={quoteHref}
                className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold uppercase tracking-wide text-white transition-all duration-fast ease-entrance hover:bg-orange-500 motion-safe:hover:-translate-y-0.5"
              >
                Quote this lane <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <p className="mt-3 text-center text-xs text-white/50">
                Or call dispatch:{" "}
                <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="font-semibold text-white/80 hover:underline">
                  {COMPANY_INFO.phone}
                </a>
              </p>
            </>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <MapPin className="h-8 w-8 text-white/30" aria-hidden />
              <p className="mt-3 text-sm text-white/70">
                Pick two different markets to see miles and transit time.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-xs leading-relaxed text-gray-500 md:px-8">
        Estimates, not a rate confirmation. Miles are practical driving miles (great-circle × road
        factor {ROAD_CIRCUITY}) except on lanes we already run weekly, where the measured distance is
        used. Transit assumes one solo driver under 11-hour hours-of-service rules — team service and
        expedited windows are available, ask dispatch.
      </p>
    </div>
  )
}
