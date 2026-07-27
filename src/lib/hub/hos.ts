/**
 * Hours-of-service rule engine — 49 CFR 395, property-carrying CMV.
 *
 * Why this exists: everything HOS in the hub today is a *reading* from an ELD
 * feed (telematics.ts stores drive/shift/cycle remaining minutes that a
 * provider computed). That is fine when a provider is connected and fresh, and
 * useless otherwise — hosLevel() already has a "stale" state for exactly that
 * hole. Dispatch still has to answer "can this driver legally take this load?"
 * when the feed is 30 hours old, when the carrier has no telematics contract,
 * or when planning a run that starts tomorrow.
 *
 * So this module computes the clocks from a duty-status log instead of reading
 * them. Pure functions, integer minutes throughout (no floats — same rule as
 * money), no database, no I/O. That makes it testable against the regulation
 * text and safe to run in a planning loop.
 *
 * WHAT IS MODELED
 *   395.3(a)(1)  10 consecutive hours off duty before driving
 *   395.3(a)(2)  14-hour driving window, not extendable by off-duty time
 *   395.3(a)(3)(i)   11-hour driving limit within that window
 *   395.3(a)(3)(ii)  30-minute break after 8 cumulative hours of DRIVING,
 *                    satisfiable by any 30 consecutive minutes not driving
 *                    (the 2020 final rule — on-duty-not-driving counts)
 *   395.3(b)     60/7 and 70/8 cycle limits
 *   395.3(c)     34-hour restart
 *   395.1(g)(1)  sleeper-berth split: a 7h+ sleeper period paired with a 2h+
 *                off/sleeper period totalling 10h+, neither counting against
 *                the 14-hour window
 *   395.1(b)(1)  adverse driving conditions: +2h to both the 11 and the 14
 *
 * WHAT IS NOT MODELED — do not let a caller assume otherwise
 *   - The 150 air-mile short-haul exception (395.1(e)); it is a logging
 *     exemption driven by geography this module cannot see.
 *   - Passenger-carrying limits (395.5), which are a different set of numbers.
 *   - Personal conveyance and yard-move sub-statuses; both arrive here as
 *     plain off-duty / on-duty respectively.
 *   - Anything jurisdictional outside the United States.
 *
 * This is a planning aid and a second opinion, not a system of record. The
 * driver's ELD remains the legal log.
 */

export type DutyStatus = "off" | "sleeper" | "driving" | "on_duty"

/** A duty-status change. The status runs until the next event, or until `now`. */
export interface DutyEvent {
  status: DutyStatus
  /** ISO-8601 timestamp at which this status began. */
  at: string
}

export interface HosOptions {
  /**
   * 60 hours in 7 days, or 70 in 8. A carrier operating every day of the week
   * uses 70/8; one that does not operate every day uses 60/7 (395.3(b)).
   */
  cycle?: 60 | 70
  /** 395.1(b)(1): adds up to 2 hours to both the driving limit and the window. */
  adverseConditions?: boolean
  /** Evaluation instant. Defaults to now. */
  now?: Date | string | number
}

export interface HosClocks {
  /** Minutes of driving still allowed under the 11-hour limit. */
  driveRemainingMinutes: number
  /** Minutes left in the 14-hour window. */
  shiftRemainingMinutes: number
  /** Minutes left under the 60/7 or 70/8 cycle. */
  cycleRemainingMinutes: number
  /** Minutes of driving allowed before the 30-minute break is owed. */
  breakRemainingMinutes: number
  /**
   * The binding constraint: minutes the driver may legally drive starting now,
   * i.e. the smallest of the four clocks. Zero means they must stop.
   */
  availableDriveMinutes: number
  /** Which limits are already exhausted, in regulation order. */
  violations: HosViolation[]
  /** Start of the current 14-hour window (end of the last qualifying break). */
  windowStartedAt: string | null
  /**
   * False when the log does not reach back to a qualifying 10-hour break, so
   * the clocks are computed from the oldest event available and may be
   * optimistic. Callers showing this to a dispatcher should say so.
   */
  windowIsCertain: boolean
  /** True when a valid 395.1(g) sleeper split established the current window. */
  usedSleeperSplit: boolean
}

export type HosViolation =
  | "drive-11"
  | "window-14"
  | "cycle"
  | "break-30"

// ---------------------------------------------------------------------------
// Regulation constants, in minutes
// ---------------------------------------------------------------------------

const MIN = 1
const HOUR = 60 * MIN

/** 395.3(a)(3)(i) */
export const DRIVE_LIMIT_MINUTES = 11 * HOUR
/** 395.3(a)(2) */
export const WINDOW_LIMIT_MINUTES = 14 * HOUR
/** 395.3(a)(1) */
export const RESET_BREAK_MINUTES = 10 * HOUR
/** 395.3(a)(3)(ii) — driving hours before a break is owed */
export const BREAK_AFTER_DRIVING_MINUTES = 8 * HOUR
/** 395.3(a)(3)(ii) — length of the qualifying break */
export const BREAK_MINUTES = 30 * MIN
/** 395.3(c) */
export const RESTART_MINUTES = 34 * HOUR
/** 395.1(b)(1) */
export const ADVERSE_BONUS_MINUTES = 2 * HOUR
/** 395.1(g)(1)(i) — the longer half of a split must be sleeper berth */
export const SPLIT_LONG_MINUTES = 7 * HOUR
/** 395.1(g)(1)(ii) — the shorter half may be off duty or sleeper */
export const SPLIT_SHORT_MINUTES = 2 * HOUR

// ---------------------------------------------------------------------------
// Interval model
// ---------------------------------------------------------------------------

interface Interval {
  status: DutyStatus
  start: number
  end: number
}

const isRest = (s: DutyStatus): boolean => s === "off" || s === "sleeper"
const isOnDuty = (s: DutyStatus): boolean => s === "driving" || s === "on_duty"

function toMs(value: Date | string | number): number {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (Number.isNaN(ms)) throw new Error(`Invalid HOS timestamp: ${String(value)}`)
  return ms
}

/**
 * Turn a duty log into closed intervals ending at `now`. Events are sorted
 * defensively — ELD exports and hand-built logs both arrive out of order — and
 * zero-length intervals (two events at the same instant) are dropped so a
 * corrected status doesn't leave a phantom.
 */
function toIntervals(log: DutyEvent[], nowMs: number): Interval[] {
  const events = log
    .map((e) => ({ status: e.status, at: toMs(e.at) }))
    .filter((e) => e.at <= nowMs)
    .sort((a, b) => a.at - b.at)

  const intervals: Interval[] = []
  for (let i = 0; i < events.length; i += 1) {
    const start = events[i].at
    const end = i + 1 < events.length ? events[i + 1].at : nowMs
    if (end > start) intervals.push({ status: events[i].status, start, end })
  }
  return intervals
}

/** Consecutive rest intervals merged into single blocks (off + sleeper both rest). */
interface RestBlock {
  start: number
  end: number
  /** True when every interval in the block was sleeper berth. */
  allSleeper: boolean
}

function restBlocks(intervals: Interval[]): RestBlock[] {
  const blocks: RestBlock[] = []
  for (const iv of intervals) {
    if (!isRest(iv.status)) continue
    const last = blocks[blocks.length - 1]
    if (last && last.end === iv.start) {
      last.end = iv.end
      last.allSleeper = last.allSleeper && iv.status === "sleeper"
    } else {
      blocks.push({ start: iv.start, end: iv.end, allSleeper: iv.status === "sleeper" })
    }
  }
  return blocks
}

const duration = (b: { start: number; end: number }): number => b.end - b.start

function minutesOfStatus(
  intervals: Interval[],
  from: number,
  to: number,
  match: (s: DutyStatus) => boolean
): number {
  let total = 0
  for (const iv of intervals) {
    if (!match(iv.status)) continue
    const start = Math.max(iv.start, from)
    const end = Math.min(iv.end, to)
    if (end > start) total += end - start
  }
  return Math.round(total / 60_000)
}

// ---------------------------------------------------------------------------
// Window detection
// ---------------------------------------------------------------------------

interface WindowInfo {
  /** Instant the 14-hour window and 11-hour clock run from. */
  startedAt: number
  /** Minutes to subtract from elapsed time (a qualifying split's second half). */
  excludedMinutes: number
  certain: boolean
  usedSplit: boolean
}

/**
 * Where does the current duty window start?
 *
 * Normally: the end of the most recent 10+ consecutive hours off duty
 * (395.3(a)(1)). A sleeper-berth split (395.1(g)(1)) can beat it — after the
 * driver completes the second half of a qualifying pair, the window runs from
 * the end of the *first* half, and the second half does not count against the
 * 14 hours. That is the whole point of splitting: the rest in the middle is
 * free.
 *
 * When the log contains neither, we run from the oldest event we have and say
 * so via `certain: false` rather than inventing a clean slate.
 */
function findWindow(intervals: Interval[]): WindowInfo {
  const blocks = restBlocks(intervals)
  const oldest = intervals[0]?.start ?? 0

  let best: WindowInfo = { startedAt: oldest, excludedMinutes: 0, certain: false, usedSplit: false }

  // A full 10-hour break resets everything.
  for (const block of blocks) {
    if (duration(block) >= RESET_BREAK_MINUTES * 60_000 && block.end >= best.startedAt) {
      best = { startedAt: block.end, excludedMinutes: 0, certain: true, usedSplit: false }
    }
  }

  // A qualifying sleeper split: adjacent rest blocks, one 7h+ sleeper and one
  // 2h+ of any rest, totalling 10h+. Either order — the regulation lets the
  // driver take the short half first.
  for (let i = 0; i + 1 < blocks.length; i += 1) {
    const first = blocks[i]
    const second = blocks[i + 1]
    const firstMs = duration(first)
    const secondMs = duration(second)
    if (firstMs + secondMs < RESET_BREAK_MINUTES * 60_000) continue

    const longFirst = first.allSleeper && firstMs >= SPLIT_LONG_MINUTES * 60_000 && secondMs >= SPLIT_SHORT_MINUTES * 60_000
    const longSecond = second.allSleeper && secondMs >= SPLIT_LONG_MINUTES * 60_000 && firstMs >= SPLIT_SHORT_MINUTES * 60_000
    if (!longFirst && !longSecond) continue

    // The pair only takes effect once the second half is complete, and it only
    // helps if it is more recent than the last full break.
    if (first.end <= best.startedAt) continue
    best = {
      startedAt: first.end,
      excludedMinutes: Math.round(secondMs / 60_000),
      certain: true,
      usedSplit: true,
    }
  }

  return best
}

// ---------------------------------------------------------------------------
// Cycle
// ---------------------------------------------------------------------------

/**
 * On-duty minutes counting against the 60/7 or 70/8 limit. A 34-hour restart
 * (395.3(c)) zeroes the count from the moment it ends; otherwise it is a
 * rolling sum over the trailing 7 or 8 days.
 */
function cycleUsedMinutes(intervals: Interval[], nowMs: number, cycle: 60 | 70): number {
  const days = cycle === 70 ? 8 : 7
  let from = nowMs - days * 24 * HOUR * 60_000

  for (const block of restBlocks(intervals)) {
    if (duration(block) >= RESTART_MINUTES * 60_000 && block.end > from) from = block.end
  }
  return minutesOfStatus(intervals, from, nowMs, isOnDuty)
}

// ---------------------------------------------------------------------------
// The 30-minute break
// ---------------------------------------------------------------------------

/**
 * Driving minutes accumulated since the last qualifying interruption. Under the
 * 2020 rule the interruption is 30 consecutive minutes of anything that is not
 * driving — on-duty-not-driving counts, which is why this looks at status
 * rather than at rest blocks.
 */
function drivingSinceBreak(intervals: Interval[], windowStart: number, nowMs: number): number {
  let from = windowStart
  let runStart: number | null = null

  for (const iv of intervals) {
    if (iv.end <= windowStart) continue
    const start = Math.max(iv.start, windowStart)
    if (iv.status === "driving") {
      runStart = null
      continue
    }
    if (runStart === null) runStart = start
    if (iv.end - runStart >= BREAK_MINUTES * 60_000) from = Math.max(from, iv.end)
  }
  return minutesOfStatus(intervals, from, nowMs, (s) => s === "driving")
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute every HOS clock from a duty log.
 *
 * An empty log means "no information", not "fully rested": every clock comes
 * back at its full limit but `windowIsCertain` is false, so a caller can tell
 * the difference between a driver who is legal and one we simply cannot see.
 */
export function computeHos(log: DutyEvent[], options: HosOptions = {}): HosClocks {
  const nowMs = toMs(options.now ?? Date.now())
  const cycle = options.cycle ?? 70
  const bonus = options.adverseConditions ? ADVERSE_BONUS_MINUTES : 0

  const intervals = toIntervals(log, nowMs)
  const window = findWindow(intervals)

  const elapsedWindow = intervals.length
    ? Math.round((nowMs - window.startedAt) / 60_000) - window.excludedMinutes
    : 0
  const driven = minutesOfStatus(intervals, window.startedAt, nowMs, (s) => s === "driving")
  const sinceBreak = intervals.length ? drivingSinceBreak(intervals, window.startedAt, nowMs) : 0
  const cycleUsed = cycleUsedMinutes(intervals, nowMs, cycle)

  const driveRemainingMinutes = Math.max(0, DRIVE_LIMIT_MINUTES + bonus - driven)
  const shiftRemainingMinutes = Math.max(0, WINDOW_LIMIT_MINUTES + bonus - Math.max(0, elapsedWindow))
  const cycleRemainingMinutes = Math.max(0, cycle * HOUR - cycleUsed)
  const breakRemainingMinutes = Math.max(0, BREAK_AFTER_DRIVING_MINUTES - sinceBreak)

  const violations: HosViolation[] = []
  if (driveRemainingMinutes === 0) violations.push("drive-11")
  if (shiftRemainingMinutes === 0) violations.push("window-14")
  if (cycleRemainingMinutes === 0) violations.push("cycle")
  if (breakRemainingMinutes === 0) violations.push("break-30")

  return {
    driveRemainingMinutes,
    shiftRemainingMinutes,
    cycleRemainingMinutes,
    breakRemainingMinutes,
    availableDriveMinutes: Math.min(
      driveRemainingMinutes,
      shiftRemainingMinutes,
      cycleRemainingMinutes,
      breakRemainingMinutes
    ),
    violations,
    windowStartedAt: intervals.length ? new Date(window.startedAt).toISOString() : null,
    windowIsCertain: intervals.length === 0 ? false : window.certain,
    usedSleeperSplit: window.usedSplit,
  }
}

export interface DriveFeasibility {
  /** Can the driver legally complete the whole run starting now? */
  legal: boolean
  /** Minutes they can drive before something stops them. */
  availableMinutes: number
  /** Minutes short, when not legal. */
  shortByMinutes: number
  /** Which limit runs out first, and what it would take to clear it. */
  blockedBy: HosViolation | null
  /** Plain-language reason a dispatcher can act on. */
  reason: string
}

const LIMIT_LABEL: Record<HosViolation, string> = {
  "drive-11": "the 11-hour driving limit",
  "window-14": "the 14-hour driving window",
  cycle: "the weekly cycle",
  "break-30": "the 30-minute break requirement",
}

const REMEDY: Record<HosViolation, string> = {
  "drive-11": "needs 10 consecutive hours off duty (or a qualifying sleeper split)",
  "window-14": "needs 10 consecutive hours off duty (or a qualifying sleeper split)",
  cycle: "needs a 34-hour restart",
  "break-30": "needs 30 consecutive minutes off the wheel",
}

/**
 * Can this driver legally drive for `minutes` starting now?
 *
 * This is the question dispatch actually asks — "will they make the 06:00
 * appointment in Yakima?" — and the answer names the binding limit so the
 * dispatcher knows whether to wait 30 minutes or re-plan the load entirely.
 */
export function canDriveFor(
  log: DutyEvent[],
  minutes: number,
  options: HosOptions = {}
): DriveFeasibility {
  const clocks = computeHos(log, options)
  const available = clocks.availableDriveMinutes

  // Ordered by how much rest the remedy demands, hardest first. Limits tie at
  // zero all the time — a driver who runs the 11 out without a break blows
  // both — and in a tie the dispatcher must hear the bigger requirement.
  // Telling them "just take 30 minutes" when the driver actually needs 10
  // hours off would be worse than saying nothing.
  const byLimit: [HosViolation, number][] = [
    ["cycle", clocks.cycleRemainingMinutes], // 34-hour restart
    ["window-14", clocks.shiftRemainingMinutes], // 10 hours off
    ["drive-11", clocks.driveRemainingMinutes], // 10 hours off
    ["break-30", clocks.breakRemainingMinutes], // 30 minutes
  ]
  const binding = byLimit.find(([, remaining]) => remaining === available)?.[0] ?? null

  if (minutes <= available) {
    return {
      legal: true,
      availableMinutes: available,
      shortByMinutes: 0,
      blockedBy: null,
      reason: `Legal: ${formatHosMinutes(available)} of drive time available, run needs ${formatHosMinutes(minutes)}.`,
    }
  }

  const short = minutes - available
  const limit = binding ?? "drive-11"
  return {
    legal: false,
    availableMinutes: available,
    shortByMinutes: short,
    blockedBy: limit,
    reason:
      `Not legal: ${formatHosMinutes(short)} short. ` +
      `${capitalize(LIMIT_LABEL[limit])} runs out first — driver ${REMEDY[limit]}.`,
  }
}

/** "7h 45m", "45m", "0m" — for driver-facing and dispatcher-facing copy alike. */
export function formatHosMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * ELD vendors spell the four duty statuses every way imaginable — "onDuty",
 * "ON_DUTY", "on_duty", "D", "SB", "driving". Normalize to our four, or null
 * when the value is genuinely unrecognized (better a gap in the log than a
 * wrong status silently inflating someone's available hours).
 */
export function normalizeDutyStatus(raw: string | null | undefined): DutyStatus | null {
  if (!raw) return null
  const key = raw.trim().toLowerCase().replace(/[\s_-]/g, "")
  if (key === "d" || key === "driving" || key === "drive") return "driving"
  if (key === "sb" || key === "sleeper" || key === "sleeperberth") return "sleeper"
  if (key === "on" || key === "onduty" || key === "ondutynotdriving" || key === "onage") return "on_duty"
  if (key === "off" || key === "offduty" || key === "offdutynotdriving") return "off"
  // Personal conveyance and yard move are sub-statuses of off/on duty; the
  // module header records that we flatten them rather than modeling them.
  if (key === "personalconveyance" || key === "pc") return "off"
  if (key === "yardmove" || key === "ym") return "on_duty"
  return null
}

/**
 * Severity for a computed set of clocks, matching the vocabulary
 * telematics.ts already uses for ELD-sourced numbers so office UI can render
 * either source with one component.
 */
export function hosLevelFromClocks(clocks: HosClocks): "violation" | "critical" | "warning" | "ok" {
  if (clocks.violations.length > 0) return "violation"
  if (clocks.availableDriveMinutes <= 60) return "critical"
  if (clocks.availableDriveMinutes <= 120) return "warning"
  return "ok"
}
