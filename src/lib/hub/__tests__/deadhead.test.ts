/**
 * Deadhead instrument (Task 1 / TOP_10 #3). The seeded book's typed deadhead
 * is a constant (miles × 0.08); this pins the fuel-basis math that measures
 * it independently — including the window where the typed number is
 * materially LOWER than measured, which is the finding the report exists to
 * show — plus the degraded-confidence and no-data paths, and the tenancy
 * scoping of the report queries.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../settings", () => ({
  getCarrierSettings: vi.fn(async () => ({ fsc: { baseCentsPerGallon: 125, mpg: 6.5 } })),
}))

import { query } from "../db"
import { deadheadFromFuel, getDeadheadReport } from "../deadhead"

const queryMock = vi.mocked(query)

describe("deadheadFromFuel", () => {
  it("computes measured empty miles and both percentages on a healthy window", () => {
    // 2,000 gallons × 6.5 MPG = 13,000 mi driven; 11,000 loaded → 2,000 empty
    // (15.4%). Dispatch typed only 900 (7.6%) — the divergence on display.
    const e = deadheadFromFuel({
      typedDeadheadMiles: 900,
      loadedMiles: 11000,
      tractorGallons: 2000,
      mpg: 6.5,
      fuelRows: 40,
    })
    expect(e.measuredTotalMiles).toBe(13000)
    expect(e.measuredEmptyMiles).toBe(2000)
    expect(e.measuredDeadheadPct).toBe(15.4)
    expect(e.typedDeadheadPct).toBe(7.6)
    expect(e.basis).toBe("fuel")
    expect(e.confidence).toBe("good")
    // The gap is the finding: measured double the typed figure.
    expect(e.measuredDeadheadPct!).toBeGreaterThan(e.typedDeadheadPct! * 2 - 0.1)
  })

  it("returns basis none with null measurements on a zero-fuel window", () => {
    const e = deadheadFromFuel({
      typedDeadheadMiles: 500,
      loadedMiles: 8000,
      tractorGallons: 0,
      mpg: 6.5,
      fuelRows: 0,
    })
    expect(e.basis).toBe("none")
    expect(e.confidence).toBe("none")
    expect(e.measuredTotalMiles).toBeNull()
    expect(e.measuredDeadheadPct).toBeNull()
    // The typed side still reports — it just has nothing to be checked against.
    expect(e.typedDeadheadPct).toBe(5.9)
  })

  it("handles a zero-loaded-mile window: everything driven was empty", () => {
    const e = deadheadFromFuel({
      typedDeadheadMiles: 0,
      loadedMiles: 0,
      tractorGallons: 100,
      mpg: 6.5,
      fuelRows: 10,
    })
    expect(e.measuredTotalMiles).toBe(650)
    expect(e.measuredEmptyMiles).toBe(650)
    expect(e.measuredDeadheadPct).toBe(100)
    expect(e.typedDeadheadPct).toBeNull() // 0/0 is not 0%
  })

  it("marks the estimate thin instead of reporting negative empty miles when fuel undercounts", () => {
    // 500 gallons × 6.5 = 3,250 mi — but the loads claim 5,000 loaded. The
    // card data is incomplete; empty floors at 0 and confidence degrades.
    const e = deadheadFromFuel({
      typedDeadheadMiles: 400,
      loadedMiles: 5000,
      tractorGallons: 500,
      mpg: 6.5,
      fuelRows: 30,
    })
    expect(e.measuredEmptyMiles).toBe(0)
    expect(e.confidence).toBe("thin")
  })

  it("degrades to thin on too few fuel rows even when the math works", () => {
    const e = deadheadFromFuel({
      typedDeadheadMiles: 100,
      loadedMiles: 1000,
      tractorGallons: 200,
      mpg: 6.5,
      fuelRows: 3,
    })
    expect(e.basis).toBe("fuel")
    expect(e.confidence).toBe("thin")
  })

  it("guards against a zero MPG setting", () => {
    const e = deadheadFromFuel({
      typedDeadheadMiles: 100,
      loadedMiles: 1000,
      tractorGallons: 200,
      mpg: 0,
      fuelRows: 30,
    })
    expect(e.basis).toBe("none")
  })
})

describe("getDeadheadReport", () => {
  beforeEach(() => queryMock.mockReset().mockResolvedValue([]))

  it("scopes both aggregates by carrier and counts only tractor fuel", async () => {
    await getDeadheadReport("carrier-1", { from: "2026-05-01", to: "2026-07-25" })
    const [loadSql, loadParams] = queryMock.mock.calls[0]
    const [fuelSql, fuelParams] = queryMock.mock.calls[1]
    expect(String(loadSql)).toContain("l.carrier_id = $1")
    expect(String(loadSql)).toContain("t.carrier_id = l.carrier_id")
    expect(String(fuelSql)).toContain("carrier_id = $1")
    expect(String(fuelSql)).toContain("fuel_use = 'tractor'")
    expect((loadParams as unknown[])[0]).toBe("carrier-1")
    expect((fuelParams as unknown[])[0]).toBe("carrier-1")
  })

  it("counts fuel from trucks with no delivered load toward the fleet total", async () => {
    queryMock
      .mockResolvedValueOnce([
        { truck_id: "t1", truck_unit: "101", loaded_miles: "1000", deadhead_miles: "80" },
      ] as never)
      .mockResolvedValueOnce([
        { truck_id: "t1", gallons: "100", rows: "10" },
        { truck_id: "t2", gallons: "50", rows: "10" }, // bobtailing all window
      ] as never)
    const report = await getDeadheadReport("carrier-1", { from: "2026-05-01", to: "2026-07-25" })
    // Fleet gallons = 150 × 6.5 = 975 total; truck t1 alone would read 650.
    expect(report.fleet.measuredTotalMiles).toBe(975)
    expect(report.trucks).toHaveLength(1)
    expect(report.trucks[0].estimate.measuredTotalMiles).toBe(650)
  })

  it("sorts the per-truck table worst measured deadhead first", async () => {
    queryMock
      .mockResolvedValueOnce([
        { truck_id: "t1", truck_unit: "101", loaded_miles: "1200", deadhead_miles: "0" },
        { truck_id: "t2", truck_unit: "102", loaded_miles: "600", deadhead_miles: "0" },
      ] as never)
      .mockResolvedValueOnce([
        { truck_id: "t1", gallons: "200", rows: "10" }, // 1300 mi, 100 empty (7.7%)
        { truck_id: "t2", gallons: "200", rows: "10" }, // 1300 mi, 700 empty (53.8%)
      ] as never)
    const report = await getDeadheadReport("carrier-1", { from: "2026-05-01", to: "2026-07-25" })
    expect(report.trucks.map((t) => t.truckUnit)).toEqual(["102", "101"])
  })
})
