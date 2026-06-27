import { describe, expect, it } from "vitest"
import { computeFleetKpis } from "../kpi"

describe("computeFleetKpis", () => {
  it("computes CPM, RPM, operating ratio, margin, and deadhead %", () => {
    const k = computeFleetKpis({
      revenueCents: 1_000_00, // $1,000
      operatingCostCents: 600_00, // $600
      loadedMiles: 500,
      deadheadMiles: 100,
    })
    expect(k.totalMiles).toBe(600)
    expect(k.netCents).toBe(400_00)
    expect(k.cpmCents).toBe(100) // $600 / 600mi = $1.00/mi
    expect(k.rpmCents).toBe(200) // $1,000 / 500 loaded mi = $2.00/mi
    expect(k.operatingRatioPct).toBe(60) // 600/1000
    expect(k.marginPct).toBe(40)
    expect(k.deadheadPct).toBeCloseTo(16.7, 1) // 100/600
  })

  it("returns null ratios instead of dividing by zero", () => {
    const k = computeFleetKpis({ revenueCents: 0, operatingCostCents: 0, loadedMiles: 0, deadheadMiles: 0 })
    expect(k.cpmCents).toBeNull()
    expect(k.rpmCents).toBeNull()
    expect(k.operatingRatioPct).toBeNull()
    expect(k.marginPct).toBeNull()
    expect(k.deadheadPct).toBeNull()
  })

  it("flags an operating ratio over 100 when costs exceed revenue (the break-even reality)", () => {
    const k = computeFleetKpis({ revenueCents: 100_00, operatingCostCents: 110_00, loadedMiles: 100, deadheadMiles: 0 })
    expect(k.operatingRatioPct).toBe(110)
    expect(k.netCents).toBe(-10_00)
    expect(k.marginPct).toBe(-10)
  })
})
