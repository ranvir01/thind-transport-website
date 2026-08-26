import { describe, expect, it } from "vitest"

import { expiryTone } from "../ExpiryPill"

/**
 * expiryTone is DriverExpiryPill's day-math, extracted as a pure function so
 * the expired/soon/ok boundaries are directly testable — the codebase has no
 * jsdom/render-test setup, so this is the only way to pin the 0d and 30d
 * cutoffs against a regression (an off-by-one here would silently reclassify
 * a truly expired CDL as "30 days left").
 */
describe("expiryTone", () => {
  const DAY = 86400000
  const now = Date.UTC(2026, 0, 1) // 2026-01-01T00:00:00Z

  it("is bad the instant a date is in the past", () => {
    expect(expiryTone(new Date(now - DAY).toISOString(), now).tone).toBe("bad")
    expect(expiryTone(new Date(now - DAY).toISOString(), now).days).toBe(-1)
  })

  it("is warn (not bad) the moment it expires today", () => {
    const { tone, days } = expiryTone(new Date(now).toISOString(), now)
    expect(tone).toBe("warn")
    expect(days).toBe(0)
  })

  it("is warn at exactly the 30-day cutoff", () => {
    const { tone, days } = expiryTone(new Date(now + 30 * DAY).toISOString(), now)
    expect(tone).toBe("warn")
    expect(days).toBe(30)
  })

  it("flips to ok one day past the 30-day cutoff", () => {
    const { tone, days } = expiryTone(new Date(now + 31 * DAY).toISOString(), now)
    expect(tone).toBe("ok")
    expect(days).toBe(31)
  })

  it("is ok for a date far in the future", () => {
    expect(expiryTone(new Date(now + 365 * DAY).toISOString(), now).tone).toBe("ok")
  })
})
