import { describe, expect, it } from "vitest"
import { nextOccurrence } from "../tasks"

const d = (iso: string) => new Date(iso)

describe("task recurrence — nextOccurrence", () => {
  it("none → null", () => {
    expect(nextOccurrence(d("2026-06-11T09:00:00"), "none")).toBeNull()
  })

  it("daily adds one day, keeping time of day", () => {
    const next = nextOccurrence(d("2026-06-11T09:00:00"), "daily")!
    expect(next.toISOString().slice(0, 13)).toBe(d("2026-06-12T09:00:00").toISOString().slice(0, 13))
  })

  it("weekdays skips Saturday and Sunday", () => {
    // Friday Jun 12 2026 → Monday Jun 15
    const next = nextOccurrence(d("2026-06-12T08:00:00"), "weekdays")!
    expect(next.getDay()).toBe(1)
    expect(next.getDate()).toBe(15)
  })

  it("weekly adds seven days", () => {
    const next = nextOccurrence(d("2026-06-11T08:00:00"), "weekly")!
    expect(next.getDate()).toBe(18)
  })

  it("monthly clamps Jan 31 → Feb 28 (non-leap)", () => {
    const next = nextOccurrence(d("2026-01-31T08:00:00"), "monthly")!
    expect(next.getMonth()).toBe(1) // February
    expect(next.getDate()).toBe(28) // 2026 is not a leap year
  })

  it("monthly keeps the same day when it fits", () => {
    const next = nextOccurrence(d("2026-06-15T08:00:00"), "monthly")!
    expect(next.getMonth()).toBe(6)
    expect(next.getDate()).toBe(15)
  })

  it("crosses a DST boundary without drifting the calendar day", () => {
    // US DST starts Mar 8 2026 (second Sunday of March).
    const next = nextOccurrence(d("2026-03-07T09:00:00"), "daily")!
    expect(next.getDate()).toBe(8)
    expect(next.getHours()).toBe(9) // local time preserved
  })
})
