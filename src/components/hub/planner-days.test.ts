import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { dayIndex } from "./planner-days"

// The planner feeds a Monday-start week of YYYY-MM-DD strings.
function week(start: string): string[] {
  const [y, m, d] = start.split("-").map(Number)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(Date.UTC(y, m - 1, d + i))
    return day.toISOString().slice(0, 10)
  })
}

const originalTz = process.env.TZ

// Pinned to the carrier's zone (Kent, WA): it observes DST, so both
// transitions land inside plannable weeks. Node re-reads TZ at runtime.
describe("dayIndex (TZ=America/Los_Angeles)", () => {
  beforeAll(() => {
    process.env.TZ = "America/Los_Angeles"
  })
  afterAll(() => {
    process.env.TZ = originalTz
  })

  it("maps a mid-week local timestamp to its column", () => {
    expect(dayIndex(week("2026-07-20"), "2026-07-22T08:00:00")).toBe(2)
  })

  it("keeps midnight and 23:59 inside the same column (time-off range pattern)", () => {
    const days = week("2026-07-20")
    expect(dayIndex(days, "2026-07-20T00:00:00")).toBe(0)
    expect(dayIndex(days, "2026-07-26T23:59:00")).toBe(6)
  })

  it("returns a negative index for a timestamp before the week (callers clamp)", () => {
    expect(dayIndex(week("2026-07-20"), "2026-07-19T23:00:00")).toBe(-1)
  })

  it("returns past-6 for a timestamp after the week (callers clamp)", () => {
    expect(dayIndex(week("2026-07-20"), "2026-07-28T06:00:00")).toBe(8)
  })

  it("converts UTC (Z-suffixed) timestamps to the local calendar date", () => {
    // 2026-07-21T02:00Z is 2026-07-20 19:00 PDT — column 0, not 1.
    expect(dayIndex(week("2026-07-20"), "2026-07-21T02:00:00Z")).toBe(0)
  })

  it("spring forward: an early-morning load the day after the 23h day stays in its column", () => {
    // US DST starts Sun 2026-03-08. Elapsed-ms math gave floor(23.5h/24h) = 0
    // and rendered this Monday 00:30 load in Sunday's column.
    expect(dayIndex(week("2026-03-08"), "2026-03-09T00:30:00")).toBe(1)
  })

  it("fall back: a late-evening load the day after the 25h day stays in its column", () => {
    // US DST ends Sun 2026-11-01. Elapsed-ms math gave floor(48.5h/24h) = 2
    // and rendered this Monday 23:30 load in Tuesday's column.
    expect(dayIndex(week("2026-11-01"), "2026-11-02T23:30:00")).toBe(1)
  })

  it("covers every column across the fall-back week at both edges of each day", () => {
    const days = week("2026-11-01")
    for (let i = 0; i < 7; i++) {
      expect(dayIndex(days, `${days[i]}T00:00:00`)).toBe(i)
      expect(dayIndex(days, `${days[i]}T23:59:00`)).toBe(i)
    }
  })
})

describe("dayIndex (TZ=UTC — no DST, sanity baseline)", () => {
  beforeAll(() => {
    process.env.TZ = "UTC"
  })
  afterAll(() => {
    process.env.TZ = originalTz
  })

  it("agrees with the calendar on the same DST-week fixtures", () => {
    expect(dayIndex(week("2026-03-08"), "2026-03-09T00:30:00")).toBe(1)
    expect(dayIndex(week("2026-11-01"), "2026-11-02T23:30:00")).toBe(1)
  })
})
