import { describe, expect, it } from "vitest"
import { mileageAmberThreshold, mileageStatus } from "../maintenance-due"

describe("mileageAmberThreshold", () => {
  it("is 10% of the interval for large intervals", () => {
    expect(mileageAmberThreshold(25000)).toBe(2500)
    expect(mileageAmberThreshold(10000)).toBe(1000)
  })

  it("floors at 500mi for small intervals", () => {
    expect(mileageAmberThreshold(2000)).toBe(500)
    expect(mileageAmberThreshold(100)).toBe(500)
  })
})

describe("mileageStatus", () => {
  it("returns nulls when the interval isn't mileage-based", () => {
    expect(mileageStatus(null, 130000, 100000)).toEqual({ color: null, milesRemaining: null })
  })

  it("returns nulls when the truck's current odometer is unknown", () => {
    expect(mileageStatus(20000, undefined, 100000)).toEqual({ color: null, milesRemaining: null })
    expect(mileageStatus(20000, null, 100000)).toEqual({ color: null, milesRemaining: null })
  })

  it("returns nulls when the schedule has never been serviced (no baseline odometer)", () => {
    expect(mileageStatus(20000, 130000, null)).toEqual({ color: null, milesRemaining: null })
  })

  it("is red once the truck has passed the interval since last service", () => {
    // 30160 mi since last service against a 20000mi interval — 10160mi overdue.
    expect(mileageStatus(20000, 130160, 100000)).toEqual({ color: "red", milesRemaining: -10160 })
  })

  it("is red exactly at the interval boundary (0 miles remaining)", () => {
    expect(mileageStatus(20000, 120000, 100000)).toEqual({ color: "red", milesRemaining: 0 })
  })

  it("is amber inside the 10%-of-interval window", () => {
    // 19800 since last service, 200 remaining, threshold is 2000 (10% of 20000).
    expect(mileageStatus(20000, 119800, 100000)).toEqual({ color: "amber", milesRemaining: 200 })
  })

  it("is green comfortably before the interval", () => {
    expect(mileageStatus(20000, 105000, 100000)).toEqual({ color: "green", milesRemaining: 15000 })
  })
})
