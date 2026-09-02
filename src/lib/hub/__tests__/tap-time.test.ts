import { describe, expect, it } from "vitest"
import { resolveTapTime } from "../tap-time"

const NOW = Date.parse("2026-09-01T12:00:00.000Z")

describe("resolveTapTime", () => {
  it("keeps a real past tap-time — a replay hours later must not re-date the arrival", () => {
    expect(resolveTapTime("2026-09-01T08:30:00.000Z", NOW)).toBe("2026-09-01T08:30:00.000Z")
  })

  it("normalizes to ISO so the column always gets one shape", () => {
    expect(resolveTapTime("2026-09-01T08:30:00Z", NOW)).toBe("2026-09-01T08:30:00.000Z")
  })

  it("tolerates small clock skew but not a tap-time from the future", () => {
    expect(resolveTapTime("2026-09-01T12:04:00.000Z", NOW)).toBe("2026-09-01T12:04:00.000Z")
    expect(resolveTapTime("2026-09-01T13:00:00.000Z", NOW)).toBe("2026-09-01T12:00:00.000Z")
  })

  it("falls back to now for garbage, empty, or absent input", () => {
    for (const bad of ["not a date", "", null, undefined]) {
      expect(resolveTapTime(bad, NOW)).toBe("2026-09-01T12:00:00.000Z")
    }
  })
})
