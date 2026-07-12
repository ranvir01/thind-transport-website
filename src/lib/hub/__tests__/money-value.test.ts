import { describe, expect, it } from "vitest"
import { Money, formatUSD } from "../money-value"

describe("Money value object", () => {
  it("rejects non-integer cents (no float money)", () => {
    expect(() => Money.fromCents(10.5)).toThrow()
    expect(Money.fromCents(1050).cents).toBe(1050)
  })

  it("parses dollars to exact cents", () => {
    expect(Money.fromDollars(32.0).cents).toBe(3200)
    expect(Money.fromDollars(0.1).cents).toBe(10)
    expect(Money.fromDollars(3.005).cents).toBe(301) // rounds at the boundary, not silently truncated
  })

  it("adds and subtracts in cents", () => {
    const a = Money.fromCents(320000)
    const b = Money.fromCents(35000)
    expect(a.add(b).cents).toBe(355000)
    expect(a.subtract(b).cents).toBe(285000)
  })

  it("multiplies by a scalar and rounds to the cent", () => {
    expect(Money.fromCents(100).times(0.075).cents).toBe(8) // 7.5 -> 8
    expect(Money.fromCents(189).times(3).cents).toBe(567)
  })

  it("rounds negative half-cents away from zero, matching roundHalfAwayFromZero and the Rust sidecar", () => {
    // Math.round would give -300 / -7; the pay engine, IFTA compute, and Rust f64::round all give -301 / -8.
    expect(Money.fromDollars(-3.005).cents).toBe(-301)
    expect(Money.fromCents(-100).times(0.075).cents).toBe(-8) // -7.5 -> -8
    expect(Money.fromCents(-125).times(0.5).cents).toBe(-63) // -62.5 -> -63
  })

  it("allocates without losing or inventing a penny", () => {
    const parts = Money.fromCents(100).allocate([1, 1, 1])
    expect(parts.map((p) => p.cents)).toEqual([34, 33, 33])
    expect(Money.sum(parts).cents).toBe(100)
  })

  it("allocates by weight, largest remainder first", () => {
    const parts = Money.fromCents(1000).allocate([60, 40])
    expect(parts.map((p) => p.cents)).toEqual([600, 400])
    expect(Money.sum(parts).cents).toBe(1000)
  })

  it("guards currency mismatches", () => {
    expect(() => Money.fromCents(100, "USD").add(Money.fromCents(100, "CAD"))).toThrow()
  })

  it("formats USD from cents", () => {
    expect(formatUSD(355000)).toBe("$3,550.00")
    expect(formatUSD(-1234)).toBe("-$12.34")
    expect(formatUSD(0)).toBe("$0.00")
  })
})
