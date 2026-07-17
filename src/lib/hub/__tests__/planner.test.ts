import { describe, expect, it } from "vitest"
import { weekStartOf } from "../planner"

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

describe("weekStartOf", () => {
  it("returns the same date when given a Monday", () => {
    expect(ymd(weekStartOf(new Date(2026, 6, 13)))).toBe("2026-07-13")
  })

  it("rolls a mid-week date back to that week's Monday", () => {
    // Thursday July 16, 2026 -> Monday July 13, 2026.
    expect(ymd(weekStartOf(new Date(2026, 6, 16)))).toBe("2026-07-13")
  })

  it("rolls Sunday back to the Monday that started its own week (not the next one)", () => {
    // Sunday July 19, 2026 belongs to the week starting Monday July 13.
    expect(ymd(weekStartOf(new Date(2026, 6, 19)))).toBe("2026-07-13")
  })

  it("rolls Saturday back to the same week's Monday", () => {
    expect(ymd(weekStartOf(new Date(2026, 6, 18)))).toBe("2026-07-13")
  })

  it("crosses a month boundary when the Monday falls in the prior month", () => {
    // Sunday March 1, 2026 -> Monday Feb 23, 2026.
    expect(ymd(weekStartOf(new Date(2026, 2, 1)))).toBe("2026-02-23")
  })

  it("crosses a year boundary when the Monday falls in the prior year", () => {
    // Friday Jan 1, 2027 -> Monday Dec 28, 2026.
    expect(ymd(weekStartOf(new Date(2027, 0, 1)))).toBe("2026-12-28")
  })

  it("handles the DST-forward transition (US spring-forward, March 2026)", () => {
    // Wed March 11, 2026 (post-DST-start) -> Monday March 9, 2026.
    expect(ymd(weekStartOf(new Date(2026, 2, 11)))).toBe("2026-03-09")
  })

  it("handles the DST-fall-back transition (US, November 2026)", () => {
    // Wed Nov 4, 2026 (post-DST-end) -> Monday Nov 2, 2026.
    expect(ymd(weekStartOf(new Date(2026, 10, 4)))).toBe("2026-11-02")
  })

  it("discards any time-of-day component on the input", () => {
    const withTime = new Date(2026, 6, 16, 23, 59, 59, 999)
    const result = weekStartOf(withTime)
    expect(ymd(result)).toBe("2026-07-13")
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it("is idempotent: applying it twice gives the same Monday", () => {
    const once = weekStartOf(new Date(2026, 6, 16))
    const twice = weekStartOf(once)
    expect(ymd(twice)).toBe(ymd(once))
  })
})
