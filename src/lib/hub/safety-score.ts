/**
 * Motive-style fleet safety scoring, pure math (no db imports — client-safe).
 *
 * Model: telematics-style safety events are weighted by severity, normalized
 * to events per 1,000 miles over a trailing 4-week window, and mapped onto a
 * 50–100 score. Scores update weekly; a 12-week series gives the trend line.
 * A window with too few miles yields null (insufficient data), never a fake
 * 100 — parked trucks aren't safe trucks, they're parked.
 */

export const SAFETY_EVENT_KINDS = [
  "speeding",
  "hard_brake",
  "hard_accel",
  "sharp_turn",
  "phone_distraction",
  "seatbelt",
  "following_distance",
  "preventable_crash",
] as const
export type SafetyEventKind = (typeof SAFETY_EVENT_KINDS)[number]

/** Severity weights (a preventable crash outweighs a month of hard brakes). */
export const SAFETY_EVENT_WEIGHTS: Record<SafetyEventKind, number> = {
  speeding: 3,
  hard_brake: 1,
  hard_accel: 1,
  sharp_turn: 1,
  phone_distraction: 4,
  seatbelt: 3,
  following_distance: 2,
  preventable_crash: 12,
}

export const SAFETY_EVENT_LABELS: Record<SafetyEventKind, string> = {
  speeding: "Speeding",
  hard_brake: "Hard brake",
  hard_accel: "Hard acceleration",
  sharp_turn: "Sharp turn",
  phone_distraction: "Phone distraction",
  seatbelt: "Seatbelt",
  following_distance: "Following distance",
  preventable_crash: "Preventable crash",
}

/** Trailing window length, in weeks. */
export const SAFETY_WINDOW_WEEKS = 4
/** Below this many miles in the window, the score is "not enough data". */
export const SAFETY_MIN_WINDOW_MILES = 250
/** Score lost per weighted event per 1,000 miles. */
const POINTS_PER_WEIGHTED_EVENT = 4

export interface SafetyWeek {
  /** ISO date (YYYY-MM-DD) of the week's Monday. Weeks must be consecutive ascending. */
  weekStart: string
  miles: number
  events: Partial<Record<SafetyEventKind, number>>
}

export interface SafetyWeekScore {
  weekStart: string
  /** 50–100, or null when the trailing window has < SAFETY_MIN_WINDOW_MILES. */
  score: number | null
  /** Weighted events per 1,000 mi over the trailing window (null with score). */
  weightedPer1000: number | null
  /** Raw (unweighted) event count in the trailing window. */
  windowEvents: number
  windowMiles: number
}

export function weightedEventTotal(events: Partial<Record<SafetyEventKind, number>>): number {
  let total = 0
  for (const kind of SAFETY_EVENT_KINDS) {
    const count = events[kind] ?? 0
    if (count > 0) total += count * SAFETY_EVENT_WEIGHTS[kind]
  }
  return total
}

export function scoreFromRate(weightedPer1000: number): number {
  const raw = 100 - weightedPer1000 * POINTS_PER_WEIGHTED_EVENT
  return Math.min(100, Math.max(50, Math.round(raw)))
}

/**
 * Rolling weekly scores: each entry scores the SAFETY_WINDOW_WEEKS-week window
 * ending at (and including) that week. Feed 12+ weeks for a 12-point trend.
 */
export function weeklySafetyScores(weeks: SafetyWeek[]): SafetyWeekScore[] {
  return weeks.map((week, i) => {
    const window = weeks.slice(Math.max(0, i - SAFETY_WINDOW_WEEKS + 1), i + 1)
    const windowMiles = window.reduce((sum, w) => sum + Math.max(0, w.miles), 0)
    const windowEvents = window.reduce(
      (sum, w) => sum + SAFETY_EVENT_KINDS.reduce((n, kind) => n + (w.events[kind] ?? 0), 0),
      0
    )
    if (windowMiles < SAFETY_MIN_WINDOW_MILES) {
      return { weekStart: week.weekStart, score: null, weightedPer1000: null, windowEvents, windowMiles }
    }
    const weighted = window.reduce((sum, w) => sum + weightedEventTotal(w.events), 0)
    const weightedPer1000 = (weighted / windowMiles) * 1000
    return {
      weekStart: week.weekStart,
      score: scoreFromRate(weightedPer1000),
      weightedPer1000: Math.round(weightedPer1000 * 100) / 100,
      windowEvents,
      windowMiles,
    }
  })
}

/** The latest computable score from a series (most recent non-null). */
export function currentSafetyScore(series: SafetyWeekScore[]): SafetyWeekScore | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].score !== null) return series[i]
  }
  return null
}

export type SafetyBand = "excellent" | "good" | "watch" | "at_risk"

export function safetyBand(score: number): SafetyBand {
  if (score >= 90) return "excellent"
  if (score >= 80) return "good"
  if (score >= 70) return "watch"
  return "at_risk"
}

export const SAFETY_BAND_LABELS: Record<SafetyBand, string> = {
  excellent: "Excellent",
  good: "Good",
  watch: "Watch",
  at_risk: "At risk",
}

/** Monday (UTC) of the week containing `date`, as YYYY-MM-DD. */
export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/** The last `count` consecutive week starts, ascending, ending with the current week. */
export function recentWeekStarts(now: Date, count: number): string[] {
  const current = weekStartOf(now)
  const out: string[] = []
  const base = new Date(`${current}T00:00:00Z`)
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setUTCDate(d.getUTCDate() - i * 7)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}
