import { describe, expect, it } from "vitest"
import { roundHalfAwayFromZero } from "@/lib/hub/rounding"

describe("roundHalfAwayFromZero", () => {
  it("rounds zero and whole numbers unchanged", () => {
    expect(roundHalfAwayFromZero(0)).toBe(0)
    expect(Math.abs(roundHalfAwayFromZero(-0))).toBe(0)
    expect(roundHalfAwayFromZero(42)).toBe(42)
    expect(roundHalfAwayFromZero(-42)).toBe(-42)
  })

  it("rounds half away from zero at ±0.5 (differs from Math.round on negatives)", () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1)
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1)
    expect(Math.round(-0.5)).toBe(-0)
  })

  it("rounds half away from zero at ±2.5", () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3)
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3)
    expect(Math.round(-2.5)).toBe(-2)
  })

  it("rounds fractional magnitudes using away-from-zero halves", () => {
    expect(roundHalfAwayFromZero(11110.5)).toBe(11111)
    expect(roundHalfAwayFromZero(-11110.5)).toBe(-11111)
    expect(roundHalfAwayFromZero(785.714)).toBe(786)
    expect(roundHalfAwayFromZero(-785.714)).toBe(-786)
  })
})
