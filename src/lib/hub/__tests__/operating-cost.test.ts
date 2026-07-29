/**
 * P2.4: carrier_settings.costPerMileCents is the single constant behind every
 * margin figure — the dispatch board prices a load as revenue - miles × cost,
 * and lanes.ts ranks every lane by it. It shipped as a hardcoded 185¢, below
 * driver pay plus fuel alone at any realistic rate, with no screen to change it
 * and nothing to check it against.
 *
 * The measured figure has to include driver pay. A "cost per mile" that quietly
 * omits payroll reads low, which would confirm an assumption that is already
 * too low — the exact failure this exists to catch.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { computeFleetKpis } from "../kpi"

const { pnlMock, driverPayMock, settingsMock } = vi.hoisted(() => ({
  pnlMock: vi.fn(),
  driverPayMock: vi.fn(),
  settingsMock: vi.fn(),
}))

vi.mock("../reports", () => ({
  truckPnlRange: pnlMock,
  driverPayCentsForRange: driverPayMock,
}))
vi.mock("../settings", () => ({ getCarrierSettings: settingsMock }))

import { measuredOperatingCost } from "../operating-cost"

const RANGE = { from: "2026-01-01", to: "2026-03-31" }

/** One truck: $10,000 revenue, $4,000 operating cost, 10,000 total miles. */
const truck = (over: Record<string, unknown> = {}) => ({
  truck_id: "t1", unit_number: "101",
  revenue_cents: 1_000_000,
  fuel_cents: 300_000, maintenance_cents: 50_000, toll_cents: 20_000, other_expense_cents: 30_000,
  loaded_miles: 9_000, deadhead_miles: 1_000, deadhead_missing_loads: 0, net_cents: 0,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  settingsMock.mockResolvedValue({ costPerMileCents: 234 })
  pnlMock.mockResolvedValue([truck()])
  driverPayMock.mockResolvedValue(600_000) // $6,000 payroll
})

describe("computeFleetKpis.allInCpmCents", () => {
  it("is operating plus driver pay over total miles", () => {
    const k = computeFleetKpis({
      revenueCents: 1_000_000, operatingCostCents: 400_000, driverPayCents: 600_000,
      loadedMiles: 9_000, deadheadMiles: 1_000,
    })
    expect(k.cpmCents).toBe(40) // operating only
    expect(k.allInCpmCents).toBe(100) // ($4,000 + $6,000) / 10,000 mi
  })

  it("is null without driver pay — never a partial figure dressed as all-in", () => {
    const k = computeFleetKpis({
      revenueCents: 1_000_000, operatingCostCents: 400_000, driverPayCents: null,
      loadedMiles: 9_000, deadheadMiles: 1_000,
    })
    expect(k.cpmCents).toBe(40)
    expect(k.allInCpmCents).toBeNull()
  })

  it("is null with no miles rather than dividing by zero", () => {
    const k = computeFleetKpis({
      revenueCents: 0, operatingCostCents: 0, driverPayCents: 0, loadedMiles: 0, deadheadMiles: 0,
    })
    expect(k.allInCpmCents).toBeNull()
  })
})

describe("measuredOperatingCost", () => {
  it("measures all-in cost per mile from the carrier's own books", async () => {
    const m = await measuredOperatingCost("carrier-1", RANGE)
    expect(m.operatingCpmCents).toBe(40)
    expect(m.allInCpmCents).toBe(100)
    expect(m.totalMiles).toBe(10_000)
    expect(m.hasDriverPay).toBe(true)
  })

  it("reports the variance against the assumption, signed", async () => {
    // Measured 100c vs an assumed 234c: the assumption is pessimistic here, so
    // the sign must read negative rather than as an absolute gap.
    const m = await measuredOperatingCost("carrier-1", RANGE)
    expect(m.configuredCpmCents).toBe(234)
    expect(m.varianceCents).toBe(100 - 234)
  })

  it("flags a flattering assumption with a positive variance", async () => {
    settingsMock.mockResolvedValue({ costPerMileCents: 60 })
    const m = await measuredOperatingCost("carrier-1", RANGE)
    expect(m.varianceCents).toBe(40) // 100 measured - 60 assumed
  })

  it("refuses to call a payroll-free figure all-in", async () => {
    driverPayMock.mockResolvedValue(null)
    const m = await measuredOperatingCost("carrier-1", RANGE)
    expect(m.hasDriverPay).toBe(false)
    expect(m.allInCpmCents).toBeNull()
    expect(m.varianceCents).toBeNull()
    // The operating-only number is still reported — it just isn't the all-in one.
    expect(m.operatingCpmCents).toBe(40)
  })

  it("treats ZERO payroll as no signal, not as free labour", async () => {
    // driverPayCentsForRange returns null for "no settlements" but 0 for
    // "settlements with no earning lines". Found on a live rig: 0 flowed
    // through and the all-in figure came out identical to the operating one,
    // presented as all-in. That understates true cost per mile by about half.
    driverPayMock.mockResolvedValue(0)
    const m = await measuredOperatingCost("carrier-1", RANGE)
    expect(m.hasDriverPay).toBe(false)
    expect(m.allInCpmCents).toBeNull()
    expect(m.operatingCpmCents).toBe(40)
  })

  it("sums across trucks rather than reading only the first", async () => {
    pnlMock.mockResolvedValue([truck(), truck({ truck_id: "t2", unit_number: "102" })])
    driverPayMock.mockResolvedValue(1_200_000)
    const m = await measuredOperatingCost("carrier-1", RANGE)
    expect(m.totalMiles).toBe(20_000)
    expect(m.allInCpmCents).toBe(100)
  })

  it("carries the blank-deadhead count, because it understates the miles", async () => {
    // Fewer miles under the same cost reads as a HIGHER cost per mile, so the
    // caller has to be able to say the figure is inflated.
    pnlMock.mockResolvedValue([truck({ deadhead_missing_loads: 4 })])
    const m = await measuredOperatingCost("carrier-1", RANGE)
    expect(m.deadheadBlankLoads).toBe(4)
  })

  it("survives an empty book without dividing by zero", async () => {
    pnlMock.mockResolvedValue([])
    driverPayMock.mockResolvedValue(null)
    const m = await measuredOperatingCost("carrier-1", RANGE)
    expect(m.totalMiles).toBe(0)
    expect(m.allInCpmCents).toBeNull()
    expect(m.operatingCpmCents).toBeNull()
  })

  it("treats a NULL deadhead column as zero miles, not NaN", async () => {
    pnlMock.mockResolvedValue([truck({ deadhead_miles: null })])
    const m = await measuredOperatingCost("carrier-1", RANGE)
    expect(m.totalMiles).toBe(9_000)
    expect(Number.isFinite(m.allInCpmCents)).toBe(true)
  })
})
