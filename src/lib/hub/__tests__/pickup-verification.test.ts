/**
 * Every result branch of the pickup check, and the two rules that make it
 * safe to run on real drivers: a stop with no coordinates can never produce
 * a mismatch, and no GPS is "unverified", not a verdict.
 */
import { describe, expect, it } from "vitest"
import { GEOFENCE_MILES, PICKUP_CHECKS, evaluatePickup, pickupPillLabel } from "../pickup-verification"

const DOCK = { lat: 47.3809, lng: -122.2348 } // Kent Distribution, from the seed
const STOP = { ...DOCK, appt_start: "2026-06-12T15:00:00Z", appt_end: "2026-06-12T17:00:00Z", fcfs: false }
const ON_TIME = "2026-06-12T15:40:00Z"

function base(over: Partial<Parameters<typeof evaluatePickup>[0]> = {}) {
  return evaluatePickup({
    sessionDriverId: "d1", loadDriverId: "d1",
    fix: { lat: 47.3815, lng: -122.2340 }, // ~50 m away
    stop: STOP, arrivedAt: ON_TIME, hasPhoto: true,
    ...over,
  })
}

describe("evaluatePickup", () => {
  it("verifies when the dispatched driver is at the dock with a photo", () => {
    const r = base()
    expect(r.result).toBe("verified")
    expect(r.distanceMiles).toBeLessThanOrEqual(0.1) // ~90 m, rounded to a tenth
    expect(r.checks.map((c) => [c.key, c.ok])).toEqual([
      ["driver", true], ["location", true], ["window", true], ["photo", true],
    ])
  })

  it("is a mismatch when a different driver arrives", () => {
    const r = base({ sessionDriverId: "d9" })
    expect(r.result).toBe("mismatch")
    expect(r.checks.find((c) => c.key === "driver")?.detail).toMatch(/different driver/)
  })

  it("is a mismatch when the device is outside the geofence", () => {
    // Tacoma, ~10 mi from Kent.
    const r = base({ fix: { lat: 47.2529, lng: -122.4443 } })
    expect(r.result).toBe("mismatch")
    expect(r.distanceMiles).toBeGreaterThan(GEOFENCE_MILES)
    expect(r.checks.find((c) => c.key === "location")?.detail).toMatch(/mi from the stop/)
  })

  it("is unverified — never a mismatch — with no device location", () => {
    const r = base({ fix: null })
    expect(r.result).toBe("unverified")
    expect(r.distanceMiles).toBeNull()
    expect(r.checks.find((c) => c.key === "location")?.ok).toBeNull()
  })

  it("cannot produce a mismatch for a stop that was never geocoded", () => {
    // Even from Tacoma: nothing to measure against.
    const r = base({ stop: { ...STOP, lat: null, lng: null }, fix: { lat: 47.2529, lng: -122.4443 } })
    expect(r.result).toBe("unverified")
    expect(r.checks.find((c) => c.key === "location")?.detail).toMatch(/never geocoded/)
  })

  it("is unverified without a photo even when everything else checks out", () => {
    expect(base({ hasPhoto: false }).result).toBe("unverified")
  })

  it("treats an unassigned load's driver check as unknown, not failed", () => {
    const r = base({ loadDriverId: null })
    expect(r.result).toBe("unverified")
    expect(r.checks.find((c) => c.key === "driver")?.ok).toBeNull()
  })

  it("keeps the window advisory: late is not a fraud signal", () => {
    const late = base({ arrivedAt: "2026-06-12T19:30:00Z" })
    expect(late.result).toBe("verified")
    expect(late.checks.find((c) => c.key === "window")).toMatchObject({ ok: false, detail: "After the window closed" })
    const early = base({ arrivedAt: "2026-06-12T13:00:00Z" })
    expect(early.checks.find((c) => c.key === "window")?.detail).toBe("Before the window opened")
    const fcfs = base({ stop: { ...STOP, fcfs: true }, arrivedAt: "2026-06-12T23:00:00Z" })
    expect(fcfs.checks.find((c) => c.key === "window")).toMatchObject({ ok: true, detail: "First come, first served" })
  })

  it("pins the office wording", () => {
    expect(PICKUP_CHECKS.location).toBe("Device was within 1 mi of the shipper")
    expect(pickupPillLabel("verified", 0.2)).toBe("Pickup verified · 0.2 mi from dock")
    expect(pickupPillLabel("mismatch", 14)).toBe("Pickup mismatch · 14 mi from dock")
    expect(pickupPillLabel("verified", null)).toBe("Pickup verified")
    // The load detail shows nothing for a shrug.
    expect(pickupPillLabel("unverified", null)).toBeNull()
  })
})
