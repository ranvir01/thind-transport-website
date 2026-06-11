/**
 * Binding retrofit regression: reefer fuel is NOT propulsion fuel — it is
 * IFTA-exempt and must be excluded from fleet MPG and tax-paid gallons.
 *
 * The golden fixture is a quarter with reefer purchases present. The IFTA
 * result with correctly-classified reefer rows must (a) equal the result with
 * the reefer rows absent, and (b) differ from the buggy result where reefer
 * gallons leak in as tractor fuel.
 */
import { describe, expect, it } from "vitest"
import { classifyFuelUse, aggregateTaxPaidGallons, propulsionGallons } from "../fuel-core"
import { computeIfta } from "../ifta-core"
import type { FuelRowForIfta } from "../fuel-core"

describe("classifyFuelUse — pump product classification", () => {
  const cases: [string, string][] = [
    ["ULSD #2", "tractor"],
    ["Diesel", "tractor"],
    ["TRACTOR DSL", "tractor"],
    ["REEFER", "reefer"],
    ["Reefer Diesel", "reefer"],
    ["RFR FUEL", "reefer"],
    ["Refrigeration fuel", "reefer"],
    ["Thermo King unit", "reefer"],
    ["DEF", "other"],
    ["DEF Bulk", "other"],
    ["Diesel Exhaust Fluid", "other"],
    ["Fuel additive", "other"],
    ["", "tractor"],
  ]
  for (const [product, expected] of cases) {
    it(`"${product || "(blank)"}" → ${expected}`, () => {
      expect(classifyFuelUse(product)).toBe(expected)
    })
  }
})

// One quarter, two trucks, WA + OR. Reefer purchases happen in both states.
const TRACTOR_ROWS: FuelRowForIfta[] = [
  { jurisdiction: "WA", gallons: 800, fuelUse: "tractor" },
  { jurisdiction: "WA", gallons: 400, fuelUse: "tractor" },
  { jurisdiction: "OR", gallons: 600, fuelUse: "tractor" },
]
const REEFER_ROWS: FuelRowForIfta[] = [
  { jurisdiction: "WA", gallons: 150, fuelUse: "reefer" },
  { jurisdiction: "OR", gallons: 90, fuelUse: "reefer" },
]
const DEF_ROWS: FuelRowForIfta[] = [{ jurisdiction: "WA", gallons: 25, fuelUse: "other" }]

const MILES = { WA: 9000, OR: 4500 }
const RATES = { WA: { rate: 0.494 }, OR: { rate: 0 } }

describe("IFTA reefer exemption — golden fixture", () => {
  it("tax-paid gallons exclude reefer and DEF rows entirely", () => {
    const gallons = aggregateTaxPaidGallons([...TRACTOR_ROWS, ...REEFER_ROWS, ...DEF_ROWS])
    expect(gallons).toEqual({ WA: 1200, OR: 600 })
  })

  it("reefer rows present-and-classified === reefer rows absent (the exemption)", () => {
    const withReefer = computeIfta({
      milesByJurisdiction: MILES,
      gallonsByJurisdiction: aggregateTaxPaidGallons([...TRACTOR_ROWS, ...REEFER_ROWS, ...DEF_ROWS]),
      rates: RATES,
    })
    const withoutReefer = computeIfta({
      milesByJurisdiction: MILES,
      gallonsByJurisdiction: aggregateTaxPaidGallons(TRACTOR_ROWS),
      rates: RATES,
    })
    expect(withReefer).toEqual(withoutReefer)
  })

  it("misclassifying reefer as tractor changes MPG and the tax bill (the bug this prevents)", () => {
    const correct = computeIfta({
      milesByJurisdiction: MILES,
      gallonsByJurisdiction: aggregateTaxPaidGallons([...TRACTOR_ROWS, ...REEFER_ROWS]),
      rates: RATES,
    })
    const buggy = computeIfta({
      milesByJurisdiction: MILES,
      gallonsByJurisdiction: aggregateTaxPaidGallons([
        ...TRACTOR_ROWS,
        ...REEFER_ROWS.map((r) => ({ ...r, fuelUse: "tractor" as const })),
      ]),
      rates: RATES,
    })

    // Correct: 13,500 mi ÷ 1,800 gal = 7.5 MPG exactly.
    expect(correct.mpg).toBeCloseTo(7.5, 10)
    expect(correct.fleetGallons).toBe(1800)
    // Buggy: 13,500 ÷ 2,040 ≈ 6.62 MPG — reefer gallons inflate burn.
    expect(buggy.fleetGallons).toBe(2040)
    expect(buggy.mpg).toBeLessThan(correct.mpg)

    // WA net tax differs: hand-computed.
    // Correct: taxable = 9000/7.5 = 1200 gal; credit 1200 gal → net $0.00.
    const correctWa = correct.rows.find((r) => r.jurisdiction === "WA")!
    expect(correctWa.netCents).toBe(0)
    // Buggy: taxable = 9000/(13500/2040) = 1360 gal; credit 1350 gal
    //        → net (1360 − 1350) × $0.494 = $4.94 owed that isn't real.
    const buggyWa = buggy.rows.find((r) => r.jurisdiction === "WA")!
    expect(buggyWa.netCents).toBe(494)
    expect(buggyWa.netCents).not.toBe(correctWa.netCents)
  })

  it("fleet MPG uses propulsion gallons only", () => {
    expect(propulsionGallons([...TRACTOR_ROWS, ...REEFER_ROWS, ...DEF_ROWS])).toBe(1800)
  })

  it("rows missing a jurisdiction never count toward credits", () => {
    const gallons = aggregateTaxPaidGallons([
      ...TRACTOR_ROWS,
      { jurisdiction: null, gallons: 500, fuelUse: "tractor" },
    ])
    expect(gallons).toEqual({ WA: 1200, OR: 600 })
  })
})
