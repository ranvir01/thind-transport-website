import { describe, expect, it } from "vitest"
import { countdown } from "./countdown"

const NOW = Date.UTC(2026, 6, 21, 17, 0, 0) // 2026-07-21T17:00:00Z

function at(minutesFromNow: number): string {
  return new Date(NOW + minutesFromNow * 60000).toISOString()
}

describe("countdown", () => {
  it("handles a missing appointment", () => {
    expect(countdown(null, NOW)).toEqual({ label: "no appt", urgent: false })
  })

  it("shows minute granularity when less than an hour late (was '0h late')", () => {
    expect(countdown(at(-30), NOW)).toEqual({ label: "30m late", urgent: true })
    expect(countdown(at(-1), NOW)).toEqual({ label: "1m late", urgent: true })
    expect(countdown(at(-59), NOW)).toEqual({ label: "59m late", urgent: true })
  })

  it("rounds lateness hours on the magnitude, not the signed value", () => {
    expect(countdown(at(-60), NOW)).toEqual({ label: "1h late", urgent: true })
    // Math.round(-1.5h) is -1 but Math.round(-2.5h) is -2; abs-first gives 2 and 3.
    expect(countdown(at(-90), NOW)).toEqual({ label: "2h late", urgent: true })
    expect(countdown(at(-150), NOW)).toEqual({ label: "3h late", urgent: true })
  })

  it("marks upcoming stops urgent only inside 30 minutes", () => {
    expect(countdown(at(0), NOW)).toEqual({ label: "in 0m", urgent: true })
    expect(countdown(at(29), NOW)).toEqual({ label: "in 29m", urgent: true })
    expect(countdown(at(30), NOW)).toEqual({ label: "in 30m", urgent: false })
    expect(countdown(at(59), NOW)).toEqual({ label: "in 59m", urgent: false })
  })

  it("switches to hours between 1 and 12 hours out", () => {
    expect(countdown(at(60), NOW)).toEqual({ label: "in 1h", urgent: false })
    expect(countdown(at(60 * 3 + 20), NOW)).toEqual({ label: "in 3h", urgent: false })
  })

  it("falls back to a clock time 12+ hours out", () => {
    const result = countdown(at(60 * 13), NOW)
    // Exact string depends on the server timezone; assert shape, not zone.
    expect(result.label).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/)
    expect(result.urgent).toBe(false)
  })
})
