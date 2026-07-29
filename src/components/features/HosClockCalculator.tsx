"use client"

/**
 * Hours-of-service clock planner.
 *
 * The resources page explained the 11/14/70 rules in bullet points and left the
 * driver to do the arithmetic in their head at a truck stop. This does it: come
 * on duty at 05:30, it tells you the 14-hour window closes at 19:30, how much
 * driving is left, when the 30-minute break is due, and the earliest you can
 * roll again after a 10-hour reset.
 *
 * All arithmetic is in minutes-since-midnight — no Date objects, no timezone,
 * and nothing that depends on when the page is rendered. Your ELD remains the
 * legal record; this is a planning aid and the UI says so.
 */

import { useMemo, useState } from "react"
import { AlertTriangle, Clock, Coffee, Moon, Timer } from "lucide-react"

const DRIVE_LIMIT_MIN = 11 * 60
const WINDOW_LIMIT_MIN = 14 * 60
const BREAK_AFTER_MIN = 8 * 60
const RESET_MIN = 10 * 60
const CYCLE_LIMIT_HOURS = 70

/** "hh:mm" → minutes since midnight. */
function parseTime(value: string): number {
  const [h = "0", m = "0"] = value.split(":")
  return Number(h) * 60 + Number(m)
}

/** Minutes since midnight → "7:30 PM", rolling past midnight and flagging it. */
function formatClock(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const nextDay = minutes >= 1440
  let h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  const meridiem = h >= 12 ? "PM" : "AM"
  h = h % 12 === 0 ? 12 : h % 12
  return `${h}:${String(m).padStart(2, "0")} ${meridiem}${nextDay ? " (next day)" : ""}`
}

const formatDuration = (minutes: number) => {
  const clamped = Math.max(0, minutes)
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

export function HosClockCalculator() {
  const [onDuty, setOnDuty] = useState("06:00")
  const [droveMinutes, setDroveMinutes] = useState(0)
  const [breakTaken, setBreakTaken] = useState(false)
  const [cycleUsed, setCycleUsed] = useState(40)

  const result = useMemo(() => {
    const start = parseTime(onDuty)
    const windowEnds = start + WINDOW_LIMIT_MIN
    const driveLeft = DRIVE_LIMIT_MIN - droveMinutes
    const windowLeft = WINDOW_LIMIT_MIN - droveMinutes
    const breakDueIn = BREAK_AFTER_MIN - droveMinutes
    const cycleLeft = CYCLE_LIMIT_HOURS - cycleUsed

    return {
      windowEnds,
      driveLeft,
      // You can never drive longer than the shorter of the two clocks.
      usableDrive: Math.max(0, Math.min(driveLeft, windowLeft)),
      breakDueIn,
      breakDueAt: start + BREAK_AFTER_MIN,
      resetDoneAt: windowEnds + RESET_MIN,
      cycleLeft,
      // The 70-hour cycle is the limit people forget until it stops them.
      cycleBinding: cycleLeft < driveLeft / 60,
    }
  }, [onDuty, droveMinutes, cycleUsed])

  const rowClass =
    "flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-5 md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600/10">
            <Timer className="h-5 w-5 text-orange-600" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-black text-gray-900">Hours-of-service clock planner</h2>
            <p className="text-sm text-gray-600">
              Your 11, your 14, your 30-minute break and your 70 — worked out, not just explained.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
        <div className="space-y-5">
          <div>
            <label htmlFor="hos-onduty" className="mb-1.5 block text-sm font-bold text-gray-900">
              Came on duty at
            </label>
            <input
              id="hos-onduty"
              type="time"
              value={onDuty}
              onChange={(e) => setOnDuty(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="hos-drove" className="text-sm font-bold text-gray-900">
                Driving time used
              </label>
              <span className="font-mono text-sm font-black tabular-nums text-orange-600">
                {formatDuration(droveMinutes)}
              </span>
            </div>
            <input
              id="hos-drove"
              type="range"
              min={0}
              max={DRIVE_LIMIT_MIN}
              step={15}
              value={droveMinutes}
              onChange={(e) => setDroveMinutes(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-orange-600"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="hos-cycle" className="text-sm font-bold text-gray-900">
                Hours used in your 70/8 cycle
              </label>
              <span className="font-mono text-sm font-black tabular-nums text-orange-600">
                {cycleUsed} hr
              </span>
            </div>
            <input
              id="hos-cycle"
              type="range"
              min={0}
              max={70}
              step={1}
              value={cycleUsed}
              onChange={(e) => setCycleUsed(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-orange-600"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <input
              type="checkbox"
              checked={breakTaken}
              onChange={(e) => setBreakTaken(e.target.checked)}
              className="h-5 w-5 accent-orange-600"
            />
            <span className="text-sm font-semibold text-gray-900">
              I&apos;ve already taken my 30-minute break
            </span>
          </label>
        </div>

        <div className="space-y-3">
          <div className={rowClass}>
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Clock className="h-4 w-4 text-orange-600" aria-hidden /> 14-hour window closes
            </span>
            <span className="font-mono font-black tabular-nums text-gray-900">
              {formatClock(result.windowEnds)}
            </span>
          </div>

          <div className={rowClass}>
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Timer className="h-4 w-4 text-orange-600" aria-hidden /> Driving time left
            </span>
            <span
              className={`font-mono font-black tabular-nums ${
                result.usableDrive === 0 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {formatDuration(result.usableDrive)}
            </span>
          </div>

          <div className={rowClass}>
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Coffee className="h-4 w-4 text-orange-600" aria-hidden /> 30-minute break
            </span>
            <span className="font-mono font-black tabular-nums text-gray-900">
              {breakTaken
                ? "Done"
                : result.breakDueIn <= 0
                  ? "Due now"
                  : `By ${formatClock(result.breakDueAt)}`}
            </span>
          </div>

          <div className={rowClass}>
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Moon className="h-4 w-4 text-orange-600" aria-hidden /> Roll again after 10-hr reset
            </span>
            <span className="font-mono font-black tabular-nums text-gray-900">
              {formatClock(result.resetDoneAt)}
            </span>
          </div>

          <div className={rowClass}>
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Clock className="h-4 w-4 text-orange-600" aria-hidden /> Left in your 70
            </span>
            <span
              className={`font-mono font-black tabular-nums ${
                result.cycleLeft <= 0 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {Math.max(0, result.cycleLeft)} hr
            </span>
          </div>

          {/* Gray copy, not amber: `.brand-page-shell` darkens `bg-amber-50`
              but has no rule for `text-amber-*`, so amber text would go
              dark-on-dark on /resources. The gray scale is force-flipped. */}
          {result.cycleBinding ? (
            <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-gray-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              Your 70-hour cycle runs out before your daily clock does — that&apos;s the limit that
              stops you today, not the 11.
            </p>
          ) : null}
        </div>
      </div>

      <p className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-xs leading-relaxed text-gray-500 md:px-8">
        A planning aid for property-carrying CDL drivers on the standard 70-hour/8-day cycle. It does
        not model sleeper-berth splits, the 16-hour short-haul exception, adverse-driving extensions,
        or the 60/7 cycle. Your ELD is the legal record — when the two disagree, the ELD wins.
      </p>
    </div>
  )
}
