/**
 * NMFTA density-guideline classification. The bracket boundaries are the
 * published table, so they are asserted directly rather than derived — a
 * refactor that shifts class 92.5 by half a pound would otherwise pass.
 */
import { describe, expect, it } from "vitest"
import {
  FREIGHT_CLASSES,
  classifyShipment,
  cubicFeet,
  freightClassFromDensity,
  type Piece,
} from "../freight-class"

const gmaPallet = (weightLbs: number, heightIn = 48, quantity = 1): Piece => ({
  lengthIn: 48,
  widthIn: 40,
  heightIn,
  weightLbs,
  quantity,
})

describe("cubic feet", () => {
  it("converts a standard 48×40×48 pallet", () => {
    // 48 × 40 × 48 = 92,160 in³ ÷ 1,728 = 53.333… ft³
    expect(cubicFeet(gmaPallet(500))).toBeCloseTo(53.333, 3)
  })

  it("multiplies by quantity", () => {
    expect(cubicFeet(gmaPallet(500, 48, 3))).toBeCloseTo(160, 3)
  })

  it("rejects a zero or negative dimension rather than dividing into nonsense", () => {
    expect(() => cubicFeet({ lengthIn: 0, widthIn: 40, heightIn: 48, weightLbs: 100 })).toThrow(/length/)
    expect(() => cubicFeet({ lengthIn: 48, widthIn: -1, heightIn: 48, weightLbs: 100 })).toThrow(/width/)
    expect(() => cubicFeet({ lengthIn: 48, widthIn: 40, heightIn: 0, weightLbs: 100 })).toThrow(/height/)
  })
})

describe("the density table's published boundaries", () => {
  // Each bracket's floor and the value just beneath it.
  const boundaries: [number, number, number][] = [
    // density, class at that density, class just below it
    [50, 50, 55],
    [35, 55, 60],
    [30, 60, 65],
    [22.5, 65, 70],
    [15, 70, 77.5],
    [13.5, 77.5, 85],
    [12, 85, 92.5],
    [10.5, 92.5, 100],
    [9, 100, 110],
    [8, 110, 125],
    [7, 125, 150],
    [6, 150, 175],
    [5, 175, 200],
    [4, 200, 250],
    [3, 250, 300],
    [2, 300, 400],
    [1, 400, 500],
  ]

  it.each(boundaries)("%d lb/ft³ is class %d, and just under it is class %d", (density, atOrAbove, below) => {
    expect(freightClassFromDensity(density)).toBe(atOrAbove)
    expect(freightClassFromDensity(density - 0.01)).toBe(below)
  })

  it("puts very dense freight at class 50 and very light freight at class 500", () => {
    expect(freightClassFromDensity(50)).toBe(50)
    expect(freightClassFromDensity(400)).toBe(50)
    expect(freightClassFromDensity(0.5)).toBe(500)
    expect(freightClassFromDensity(0)).toBe(500)
  })

  it("rejects a negative density", () => {
    expect(() => freightClassFromDensity(-1)).toThrow(/non-negative/)
  })

  it("exposes all 18 classes, lightest freight first", () => {
    expect(FREIGHT_CLASSES).toHaveLength(18)
    expect(FREIGHT_CLASSES[0]).toBe(500)
    expect(FREIGHT_CLASSES[FREIGHT_CLASSES.length - 1]).toBe(50)
  })
})

describe("classifyShipment", () => {
  it("classifies one standard pallet", () => {
    // 53.333 ft³ at 800 lbs = 15.0 lb/ft³ → class 70.
    const result = classifyShipment([gmaPallet(800)])
    expect(result.freightClass).toBe(70)
    expect(result.densityLbsPerCubicFoot).toBe(15)
    expect(result.cubicFeet).toBe(53.33)
    expect(result.totalWeightLbs).toBe(800)
    expect(result.pieceCount).toBe(1)
    expect(result.bracket).toBe("15 to under 22.5 lb/ft³")
  })

  it("sums the whole shipment rather than classing each piece", () => {
    // A dense pallet and a light one average out to one class for the load —
    // this is the mistake that gets shipments re-classed.
    const dense = gmaPallet(2_000, 48)
    const light = gmaPallet(100, 48)
    const together = classifyShipment([dense, light])

    expect(classifyShipment([dense]).freightClass).toBe(55)
    expect(classifyShipment([light]).freightClass).toBe(400)
    // 2,100 lbs over 106.67 ft³ = 19.7 lb/ft³ → class 70.
    expect(together.freightClass).toBe(70)
    expect(together.pieceCount).toBe(2)
  })

  it("expands quantities into the piece count and the totals", () => {
    const result = classifyShipment([gmaPallet(500, 48, 4)])
    expect(result.pieceCount).toBe(4)
    expect(result.totalWeightLbs).toBe(2_000)
    expect(result.cubicFeet).toBe(213.33)
  })

  it("says how many pounds would reach the next cheaper class", () => {
    // 53.333 ft³ at 800 lbs is 15 lb/ft³ (class 70). Class 65 starts at 22.5,
    // which needs 22.5 × 53.333 = 1,200 lbs — 400 more.
    const result = classifyShipment([gmaPallet(800)])
    expect(result.poundsToNextLowerClass).toBe(400)
  })

  it("reports no next class once the freight is already class 50", () => {
    const result = classifyShipment([gmaPallet(4_000)])
    expect(result.freightClass).toBe(50)
    expect(result.poundsToNextLowerClass).toBeNull()
    expect(result.bracket).toBe("50 lb/ft³ and over")
  })

  it("labels the lightest bracket as an open-ended 'under'", () => {
    expect(classifyShipment([gmaPallet(20)]).bracket).toBe("under 1 lb/ft³")
  })

  it("always carries the caveat that density is only the starting point", () => {
    const result = classifyShipment([gmaPallet(800)])
    expect(result.caveat).toContain("NMFC item number")
    expect(result.caveat).toContain("Confirm with your carrier")
  })

  it("rejects an empty shipment, a zero weight, and a fractional quantity", () => {
    expect(() => classifyShipment([])).toThrow(/at least one piece/)
    expect(() => classifyShipment([gmaPallet(0)])).toThrow(/positive number of pounds/)
    expect(() => classifyShipment([{ ...gmaPallet(100), quantity: 1.5 }])).toThrow(/whole number/)
    expect(() => classifyShipment([{ ...gmaPallet(100), quantity: 0 }])).toThrow(/whole number/)
  })
})
