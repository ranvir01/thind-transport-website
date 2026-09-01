import { describe, expect, it } from "vitest"
import { scoreLoadCandidate } from "../ranker"

describe("best-load ranker", () => {
  it("scores a strong load deterministically and exposes full math", () => {
    const result = scoreLoadCandidate({
      linehaulCents: 340000,
      fuelSurchargeCents: 42000,
      loadedMiles: 870,
      deadheadMiles: 26,
      dieselCentsPerGallon: 435,
      mpg: 6,
      estimatedTollsCents: 8500,
      hosHoursRemaining: 8,
      laneStrength: "strong",
      homeTimeFit: "good",
      customerPaymentDays: 18,
      blacklisted: false,
      equipmentMatch: true,
    })

    expect(result.score).toBe(95)
    expect(result.math.totalRevenueCents).toBe(382000)
    expect(result.math.totalMiles).toBe(896)
    expect(result.math.ratePerTotalMile).toBe("4.26")
    expect(result.math.estimatedFuelCents).toBe(64960)
    expect(result.math.netAfterFuelAndTollsCents).toBe(308540)
    expect(result.math.netPerTotalMile).toBe("3.44")
    expect(result.math.explanation).toContain("strong outbound lane")
  })

  it("penalizes slow payers, weak lanes, home-time miss, blacklist, and equipment mismatch", () => {
    const result = scoreLoadCandidate({
      linehaulCents: 395000,
      fuelSurchargeCents: 44000,
      loadedMiles: 1410,
      deadheadMiles: 34,
      dieselCentsPerGallon: 435,
      mpg: 6,
      estimatedTollsCents: 32000,
      hosHoursRemaining: 4,
      laneStrength: "weak",
      homeTimeFit: "bad",
      customerPaymentDays: 58,
      blacklisted: true,
      equipmentMatch: false,
    })

    expect(result.score).toBe(0)
    expect(result.math.blacklistPenalty).toBe(-100)
    expect(result.math.equipmentPenalty).toBe(-50)
    expect(result.math.paymentScore).toBe(-15)
  })
})
