import { describe, expect, it } from "vitest"
import { computeFleetKpis } from "../kpi"

describe("computeFleetKpis", () => {
  it("computes CPM, RPM, and deadhead % from the operating base", () => {
    const k = computeFleetKpis({
      revenueCents: 1_000_00, // $1,000
      operatingCostCents: 600_00, // $600
      loadedMiles: 500,
      deadheadMiles: 100,
    })
    expect(k.totalMiles).toBe(600)
    expect(k.netBeforeDriverPayCents).toBe(400_00)
    expect(k.cpmCents).toBe(100) // $600 / 600mi = $1.00/mi
    expect(k.rpmCents).toBe(200) // $1,000 / 500 loaded mi = $2.00/mi
    expect(k.deadheadPct).toBeCloseTo(16.7, 1) // 100/600
    expect(k.loadedPct).toBeCloseTo(83.3, 1) // 500/600
  })

  it("returns null ratios instead of dividing by zero", () => {
    const k = computeFleetKpis({ revenueCents: 0, operatingCostCents: 0, loadedMiles: 0, deadheadMiles: 0 })
    expect(k.cpmCents).toBeNull()
    expect(k.rpmCents).toBeNull()
    expect(k.operatingRatioPct).toBeNull()
    expect(k.operatingRatioBeforeDriverPayPct).toBeNull()
    expect(k.marginPct).toBeNull()
    expect(k.marginBeforeDriverPayPct).toBeNull()
    expect(k.deadheadPct).toBeNull()
    expect(k.loadedPct).toBeNull()
  })

  it("keeps loadedPct + deadheadPct summing to exactly 100 (regression: independently rounded shares used to read e.g. 100.4%)", () => {
    const k = computeFleetKpis({ revenueCents: 1, operatingCostCents: 1, loadedMiles: 560, deadheadMiles: 40 })
    expect(k.loadedPct! + k.deadheadPct!).toBe(100)
  })

  describe("driver pay in the cost base", () => {
    it("withholds margin and operating ratio entirely when driver pay is not supplied", () => {
      const k = computeFleetKpis({
        revenueCents: 1_000_00,
        operatingCostCents: 600_00,
        loadedMiles: 500,
        deadheadMiles: 100,
      })
      // The whole point: a caller with no payroll data gets NO net-margin
      // number to render, only the partial one under its honest name.
      expect(k.driverPayCents).toBeNull()
      expect(k.totalCostCents).toBeNull()
      expect(k.netCents).toBeNull()
      expect(k.marginPct).toBeNull()
      expect(k.operatingRatioPct).toBeNull()
      expect(k.marginBeforeDriverPayPct).toBe(40)
      expect(k.operatingRatioBeforeDriverPayPct).toBe(60)
    })

    it("treats an explicitly omitted (undefined) driverPayCents the same as null", () => {
      const k = computeFleetKpis({
        revenueCents: 1_000_00,
        operatingCostCents: 600_00,
        driverPayCents: undefined,
        loadedMiles: 500,
        deadheadMiles: 100,
      })
      expect(k.marginPct).toBeNull()
      expect(k.operatingRatioPct).toBeNull()
    })

    it("emits margin and operating ratio from the full base when driver pay is supplied", () => {
      const k = computeFleetKpis({
        revenueCents: 1_000_00,
        operatingCostCents: 600_00,
        driverPayCents: 300_00,
        loadedMiles: 500,
        deadheadMiles: 100,
      })
      expect(k.driverPayCents).toBe(300_00)
      expect(k.totalCostCents).toBe(900_00)
      expect(k.netCents).toBe(100_00)
      expect(k.marginPct).toBe(10)
      expect(k.operatingRatioPct).toBe(90)
      // The partial figures stay available, and stay obviously rosier.
      expect(k.netBeforeDriverPayCents).toBe(400_00)
      expect(k.marginBeforeDriverPayPct).toBe(40)
      expect(k.operatingRatioBeforeDriverPayPct).toBe(60)
    })

    it("honours a genuine zero — 0 is a known cost, not a missing one", () => {
      const k = computeFleetKpis({
        revenueCents: 1_000_00,
        operatingCostCents: 600_00,
        driverPayCents: 0,
        loadedMiles: 500,
        deadheadMiles: 0,
      })
      expect(k.totalCostCents).toBe(600_00)
      expect(k.marginPct).toBe(40)
    })

    it("turns a comfortable pre-pay margin into a loss once driver pay is counted (the reason this exists)", () => {
      // Shape of the seeded book: driver settlements ~50% of revenue, against
      // an operating base (fuel + maint + expenses) of ~55%. Reported as
      // "net margin" from the operating base alone it reads +45%.
      const revenueCents = 200_000_00
      const k = computeFleetKpis({
        revenueCents,
        operatingCostCents: 110_000_00,
        driverPayCents: 100_000_00,
        loadedMiles: 80_000,
        deadheadMiles: 8_000,
      })
      expect(k.marginBeforeDriverPayPct).toBe(45)
      expect(k.marginPct).toBe(-5)
      expect(k.operatingRatioPct).toBe(105) // over 100 = losing money
      expect(k.netCents).toBe(-10_000_00)
    })

    it("flags an operating ratio over 100 when costs exceed revenue (the break-even reality)", () => {
      const k = computeFleetKpis({
        revenueCents: 100_00,
        operatingCostCents: 110_00,
        driverPayCents: 0,
        loadedMiles: 100,
        deadheadMiles: 0,
      })
      expect(k.operatingRatioPct).toBe(110)
      expect(k.netCents).toBe(-10_00)
      expect(k.marginPct).toBe(-10)
    })
  })
})
