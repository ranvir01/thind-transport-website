/**
 * Shift Mode's math is the part of the simulation that must never surprise:
 * positions, ETAs, and NPC statuses are derived from timestamps the world
 * already carries, so every function here has to be deterministic, clamped,
 * and timezone-honest (PT business hours across DST). Ping generation is the
 * row-growth guard — bounded even after an overnight gap.
 */
import { describe, expect, it } from "vitest"
import {
  etaAt,
  expectedNpcStatus,
  hash01,
  hourInPT,
  interpolate,
  isBusinessHoursPT,
  pingTimes,
  podDueAt,
  progressAt,
  topUp,
} from "../sandbox-sim-math"
import { AVG_MPH } from "../sandbox-world"

const MIN = 60_000
const HOUR = 3_600_000

describe("hash01", () => {
  it("is deterministic and stays in [0, 1)", () => {
    expect(hash01("load-1")).toBe(hash01("load-1"))
    for (const key of ["a", "b", "load-abc", ""]) {
      const v = hash01(key)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    expect(hash01("a")).not.toBe(hash01("b"))
  })
})

describe("interpolate", () => {
  const o = { lat: 45, lng: -122 }
  const d = { lat: 47, lng: -120 }

  it("hits the endpoints exactly when unjittered", () => {
    expect(interpolate(o, d, 0)).toEqual(o)
    expect(interpolate(o, d, 1)).toEqual(d)
  })

  it("clamps out-of-range fractions instead of overshooting the lane", () => {
    expect(interpolate(o, d, 4.2)).toEqual(d)
    expect(interpolate(o, d, -1)).toEqual(o)
  })

  it("jitter is deterministic per key and small", () => {
    const a = interpolate(o, d, 0.5, "truck-a")
    expect(interpolate(o, d, 0.5, "truck-a")).toEqual(a)
    expect(Math.abs(a.lat - 46)).toBeLessThan(0.05)
    expect(interpolate(o, d, 0.5, "truck-b")).not.toEqual(a)
  })
})

describe("progressAt / etaAt", () => {
  const departed = new Date("2026-01-15T08:00:00Z")

  it("covers the lane at AVG_MPH", () => {
    const halfway = new Date(departed.getTime() + (260 / AVG_MPH) * HOUR)
    expect(progressAt(departed, halfway, 520)).toBeCloseTo(0.5, 5)
    expect(etaAt(departed, 520).getTime()).toBe(departed.getTime() + 10 * HOUR)
  })

  it("clamps: before departure is 0, a zero-mile lane is already there", () => {
    expect(progressAt(departed, new Date(departed.getTime() - HOUR), 520)).toBe(0)
    expect(progressAt(departed, departed, 0)).toBe(1)
  })

  it("past the ETA reads ≥ 1 (arrival is derived, not evented)", () => {
    expect(progressAt(departed, new Date(departed.getTime() + 11 * HOUR), 520)).toBeGreaterThan(1)
  })
})

describe("podDueAt", () => {
  it("lands 10–20 minutes after delivery, deterministically per load", () => {
    const delivered = new Date("2026-01-15T14:00:00Z")
    const due = podDueAt(delivered, "load-x")
    expect(due.getTime()).toBeGreaterThanOrEqual(delivered.getTime() + 10 * MIN)
    expect(due.getTime()).toBeLessThanOrEqual(delivered.getTime() + 20 * MIN)
    expect(podDueAt(delivered, "load-x").getTime()).toBe(due.getTime())
  })
})

describe("expectedNpcStatus", () => {
  const appt = new Date("2026-01-15T16:00:00Z")
  const base = { status: "booked" as const, pickupAppt: appt, pickupDepartedAt: null, loadedMiles: 520 }

  it("walks the pickup timeline: booked → dispatched (appt−2h) → at_pickup (appt) → in_transit (+45m)", () => {
    expect(expectedNpcStatus({ ...base, now: new Date(appt.getTime() - 3 * HOUR) })).toBe("booked")
    expect(expectedNpcStatus({ ...base, now: new Date(appt.getTime() - HOUR) })).toBe("dispatched")
    expect(expectedNpcStatus({ ...base, now: new Date(appt.getTime() + 10 * MIN) })).toBe("at_pickup")
    expect(expectedNpcStatus({ ...base, now: new Date(appt.getTime() + 50 * MIN) })).toBe("in_transit")
  })

  it("once rolling, only distance decides: in_transit until progress ≥ 1, then delivered", () => {
    const departed = new Date("2026-01-15T08:00:00Z")
    const rolling = { ...base, status: "in_transit" as const, pickupDepartedAt: departed }
    expect(expectedNpcStatus({ ...rolling, now: new Date(departed.getTime() + HOUR) })).toBe("in_transit")
    expect(expectedNpcStatus({ ...rolling, now: new Date(departed.getTime() + 11 * HOUR) })).toBe("delivered")
  })

  it("never invents work for quoted or cancelled loads", () => {
    expect(expectedNpcStatus({ ...base, status: "quoted", now: new Date(appt.getTime() + HOUR) })).toBe("quoted")
    expect(expectedNpcStatus({ ...base, status: "cancelled", now: new Date(appt.getTime() + HOUR) })).toBe("cancelled")
  })
})

describe("PT business hours (DST both sides)", () => {
  it("winter (PST, UTC−8): 14:00Z is 06:00 — open; 13:59Z is closed", () => {
    expect(hourInPT(new Date("2026-01-15T14:00:00Z"))).toBe(6)
    expect(isBusinessHoursPT(new Date("2026-01-15T14:00:00Z"))).toBe(true)
    expect(isBusinessHoursPT(new Date("2026-01-15T13:59:00Z"))).toBe(false)
  })

  it("summer (PDT, UTC−7): 13:00Z is 06:00 — open; 03:00Z (20:00 PT) is closed", () => {
    expect(isBusinessHoursPT(new Date("2026-07-15T13:00:00Z"))).toBe(true)
    expect(isBusinessHoursPT(new Date("2026-07-15T12:59:00Z"))).toBe(false)
    expect(isBusinessHoursPT(new Date("2026-07-16T03:00:00Z"))).toBe(false)
  })
})

describe("pingTimes (the row-growth guard)", () => {
  const now = new Date("2026-01-15T12:00:00Z")

  it("emits nothing under a minute of wall time or with a zero cap", () => {
    expect(pingTimes(new Date(now.getTime() - 30_000), now, now, 12)).toEqual([])
    expect(pingTimes(new Date(now.getTime() - 10 * MIN), now, now, 0)).toEqual([])
  })

  it("one ping per elapsed minute on a live tick", () => {
    const times = pingTimes(new Date(now.getTime() - 90_000), now, now, 1)
    expect(times).toHaveLength(1)
    expect(times[0].getTime()).toBeLessThanOrEqual(now.getTime())
  })

  it("an overnight gap yields a sparse capped trail, never a firehose", () => {
    const times = pingTimes(new Date(now.getTime() - 14 * HOUR), now, now, 12)
    expect(times).toHaveLength(12)
    for (let i = 1; i < times.length; i++) {
      expect(times[i].getTime() - times[i - 1].getTime()).toBeGreaterThanOrEqual(60_000)
    }
    expect(times[times.length - 1].getTime()).toBeLessThanOrEqual(now.getTime())
  })

  it("stops at the ETA when the truck arrived mid-gap", () => {
    const eta = new Date(now.getTime() - 2 * HOUR)
    const times = pingTimes(new Date(now.getTime() - 4 * HOUR), eta, now, 12)
    expect(times.length).toBeGreaterThan(0)
    expect(times[times.length - 1].getTime()).toBeLessThanOrEqual(eta.getTime())
  })
})

describe("topUp", () => {
  it("fills toward the target but never past the cap, and never negative", () => {
    expect(topUp(3, 7, 4)).toBe(4)
    expect(topUp(6, 7, 4)).toBe(1)
    expect(topUp(9, 7, 4)).toBe(0)
    expect(topUp(0, 7, 1)).toBe(1)
  })
})
