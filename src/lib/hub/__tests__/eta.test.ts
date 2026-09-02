/**
 * The one ETA. Extracted from planner.ts's private emptyEta so /track, the
 * portal and the load detail can share it. The cases that matter are the
 * refusals: a stale ping or a destination with no coordinates must yield null,
 * because a confidently wrong arrival time is worse than none — a broker will
 * plan a dock around it.
 */
import { describe, expect, it } from "vitest"
import {
  AVG_MPH,
  MAX_PING_AGE_HOURS,
  ROAD_FACTOR,
  estimateArrival,
  formatEta,
  greatCircleMiles,
  roundEta,
} from "../eta"

// Kent, WA → Fresno, CA: ~750 great-circle miles.
const KENT = { lat: 47.38, lng: -122.23 }
const FRESNO = { lat: 36.74, lng: -119.78 }
const NOW = new Date("2026-06-12T18:00:00Z")

function ping(minutesAgo: number, at = KENT) {
  return { ...at, ts: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString() }
}

describe("estimateArrival", () => {
  it("drives the haversine distance at road factor and average speed, from the ping time", () => {
    const eta = estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW })
    expect(eta).not.toBeNull()
    const miles = greatCircleMiles(KENT.lat, KENT.lng, FRESNO.lat, FRESNO.lng) * ROAD_FACTOR
    expect(eta!.miles).toBe(Math.round(miles))
    expect(eta!.driveHours).toBeCloseTo(miles / AVG_MPH, 1)
    expect(eta!.at.getTime()).toBeCloseTo(NOW.getTime() + (miles / AVG_MPH) * 3_600_000, -3)
    expect(eta!.basis).toBe("physics")
  })

  it("counts drive time from the ping, not from now — the truck kept moving", () => {
    const fresh = estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW })!
    const older = estimateArrival({ ping: ping(120), dest: FRESNO, now: NOW })!
    // Same position reported two hours earlier arrives two hours earlier.
    expect(fresh.at.getTime() - older.at.getTime()).toBe(120 * 60_000)
  })

  it("prefers router miles when supplied", () => {
    const eta = estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW, roadMiles: 900 })!
    expect(eta.miles).toBe(900)
    expect(eta.driveHours).toBeCloseTo(900 / AVG_MPH, 2)
  })

  it("ignores a negative or missing router result and falls back to haversine", () => {
    const fallback = estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW })!
    expect(estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW, roadMiles: -1 })!.miles).toBe(fallback.miles)
    expect(estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW, roadMiles: null })!.miles).toBe(fallback.miles)
  })

  it("refuses a ping older than the trust window", () => {
    const justInside = estimateArrival({ ping: ping(MAX_PING_AGE_HOURS * 60 - 1), dest: FRESNO, now: NOW })
    const justOutside = estimateArrival({ ping: ping(MAX_PING_AGE_HOURS * 60 + 1), dest: FRESNO, now: NOW })
    expect(justInside).not.toBeNull()
    expect(justOutside).toBeNull()
  })

  it("flags a ping past half the window as stale so the UI can hedge", () => {
    expect(estimateArrival({ ping: ping(30), dest: FRESNO, now: NOW })!.stale).toBe(false)
    expect(estimateArrival({ ping: ping((MAX_PING_AGE_HOURS / 2) * 60 + 1), dest: FRESNO, now: NOW })!.stale).toBe(true)
  })

  it("refuses when there is no ping or no destination coordinates", () => {
    expect(estimateArrival({ ping: null, dest: FRESNO, now: NOW })).toBeNull()
    expect(estimateArrival({ ping: ping(0), dest: null, now: NOW })).toBeNull()
    expect(estimateArrival({ ping: ping(0), dest: { lat: null, lng: -119 }, now: NOW })).toBeNull()
    expect(estimateArrival({ ping: { ...KENT, ts: "not a date" }, dest: FRESNO, now: NOW })).toBeNull()
  })

  it("measures lateness against the appointment end, falling back to the start", () => {
    const eta = estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW })!
    const early = new Date(eta.at.getTime() + 60 * 60_000).toISOString()
    const late = new Date(eta.at.getTime() - 90 * 60_000).toISOString()
    expect(estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW, apptStart: late, apptEnd: early })!.lateMinutes).toBe(0)
    expect(estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW, apptStart: late })!.lateMinutes).toBe(90)
    expect(estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW })!.lateMinutes).toBe(0)
  })
})

describe("formatting", () => {
  it("rounds to five minutes — a to-the-minute estimate reads as a promise", () => {
    expect(roundEta(new Date("2026-06-12T15:38:20Z")).toISOString()).toBe("2026-06-12T15:40:00.000Z")
    expect(roundEta(new Date("2026-06-12T15:32:00Z")).toISOString()).toBe("2026-06-12T15:30:00.000Z")
  })

  it("shows a weekday only when the arrival is not today", () => {
    const base = estimateArrival({ ping: ping(0), dest: FRESNO, now: NOW })!
    const today = { ...base, at: new Date("2026-06-12T22:40:00Z") }
    const tomorrow = { ...base, at: new Date("2026-06-13T22:40:00Z") }
    expect(formatEta(today, NOW, "UTC")).toBe("~10:40 PM")
    expect(formatEta(tomorrow, NOW, "UTC")).toMatch(/^~Sat 10:40 PM$/)
  })
})
