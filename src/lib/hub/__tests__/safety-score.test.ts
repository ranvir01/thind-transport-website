import { describe, expect, it } from "vitest"
import {
  SAFETY_EVENT_KINDS,
  SAFETY_EVENT_WEIGHTS,
  SAFETY_MIN_WINDOW_MILES,
  currentSafetyScore,
  recentWeekStarts,
  safetyBand,
  weekStartOf,
  weeklySafetyScores,
  weightedEventTotal,
  type SafetyWeek,
} from "../safety-score"

const week = (weekStart: string, miles: number, events: SafetyWeek["events"] = {}): SafetyWeek => ({
  weekStart,
  miles,
  events,
})

describe("weightedEventTotal", () => {
  it("sums counts by severity weight", () => {
    expect(weightedEventTotal({ hard_brake: 2, speeding: 1 })).toBe(2 * 1 + 1 * 3)
    expect(weightedEventTotal({})).toBe(0)
  })

  it("a preventable crash outweighs any single behavior event", () => {
    for (const kind of SAFETY_EVENT_KINDS.filter((k) => k !== "preventable_crash")) {
      expect(SAFETY_EVENT_WEIGHTS.preventable_crash).toBeGreaterThan(SAFETY_EVENT_WEIGHTS[kind])
    }
  })
})

describe("weeklySafetyScores", () => {
  it("scores a clean fleet at 100", () => {
    const series = weeklySafetyScores([
      week("2026-07-13", 2000),
      week("2026-07-20", 2000),
      week("2026-07-27", 2000),
      week("2026-08-03", 2000),
    ])
    expect(series.at(-1)?.score).toBe(100)
    expect(series.at(-1)?.windowMiles).toBe(8000)
  })

  it("uses a trailing 4-week window, not the whole series", () => {
    // A crash in week 1 must fall out of the window by week 5.
    const weeks = [
      week("2026-06-29", 2500, { preventable_crash: 1 }),
      week("2026-07-06", 2500),
      week("2026-07-13", 2500),
      week("2026-07-20", 2500),
      week("2026-07-27", 2500),
    ]
    const series = weeklySafetyScores(weeks)
    expect(series[3].score).toBeLessThan(100) // crash still in window
    expect(series[4].score).toBe(100) // crash aged out
  })

  it("clamps to the 50 floor instead of going negative", () => {
    const series = weeklySafetyScores([
      week("2026-08-03", 300, { preventable_crash: 3, phone_distraction: 10 }),
    ])
    expect(series[0].score).toBe(50)
  })

  it("returns null (not a fake 100) when window miles are too thin", () => {
    const series = weeklySafetyScores([week("2026-08-03", SAFETY_MIN_WINDOW_MILES - 1)])
    expect(series[0].score).toBeNull()
    expect(series[0].weightedPer1000).toBeNull()
  })

  it("normalizes per 1,000 miles so a big fleet is not punished for exposure", () => {
    // Same event rate at 10x miles → same score.
    const small = weeklySafetyScores([week("2026-08-03", 1000, { hard_brake: 2 })])
    const large = weeklySafetyScores([week("2026-08-03", 10000, { hard_brake: 20 })])
    expect(small[0].score).toBe(large[0].score)
  })
})

describe("currentSafetyScore", () => {
  it("skips trailing thin weeks to the last computable score", () => {
    const series = weeklySafetyScores([
      week("2026-07-27", 3000, { speeding: 2 }),
      week("2026-08-03", 0), // truck parked, but the window still carries prior miles
    ])
    const current = currentSafetyScore(series)
    expect(current?.score).not.toBeNull()
  })

  it("returns null when nothing is computable", () => {
    expect(currentSafetyScore(weeklySafetyScores([week("2026-08-03", 10)]))).toBeNull()
  })
})

describe("safetyBand", () => {
  it("maps the ladder", () => {
    expect(safetyBand(95)).toBe("excellent")
    expect(safetyBand(85)).toBe("good")
    expect(safetyBand(72)).toBe("watch")
    expect(safetyBand(50)).toBe("at_risk")
  })
})

describe("week helpers", () => {
  it("weekStartOf returns the Monday of the week", () => {
    expect(weekStartOf(new Date("2026-08-09T12:00:00Z"))).toBe("2026-08-03") // Sunday → prior Monday
    expect(weekStartOf(new Date("2026-08-03T00:00:00Z"))).toBe("2026-08-03") // Monday → itself
  })

  it("recentWeekStarts yields consecutive ascending Mondays ending now", () => {
    const weeks = recentWeekStarts(new Date("2026-08-09T12:00:00Z"), 12)
    expect(weeks).toHaveLength(12)
    expect(weeks.at(-1)).toBe("2026-08-03")
    expect(weeks[0]).toBe("2026-05-18")
    for (let i = 1; i < weeks.length; i++) {
      const prev = new Date(`${weeks[i - 1]}T00:00:00Z`).getTime()
      const cur = new Date(`${weeks[i]}T00:00:00Z`).getTime()
      expect(cur - prev).toBe(7 * 24 * 3600 * 1000)
    }
  })
})
