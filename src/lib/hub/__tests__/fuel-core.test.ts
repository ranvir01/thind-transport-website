/**
 * fuel-core.ts had zero direct test coverage despite enforcing the binding
 * IFTA rule in its own file header: reefer fuel is IFTA-exempt and must never
 * be counted as propulsion/tax-paid, and the default classification for an
 * unrecognized product must be "tractor" (understating tax-paid credits is
 * safe; understating tax owed is not).
 */
import { describe, expect, it } from "vitest"
import {
  aggregateTaxPaidGallons,
  classifyFuelUse,
  fuelSpendCents,
  netAfterFuelCents,
  propulsionGallons,
  type FuelRowForIfta,
} from "../fuel-core"

describe("classifyFuelUse", () => {
  it("defaults to tractor for null, undefined, or blank input", () => {
    expect(classifyFuelUse(null)).toBe("tractor")
    expect(classifyFuelUse(undefined)).toBe("tractor")
    expect(classifyFuelUse("   ")).toBe("tractor")
  })

  it("defaults to tractor for an unrecognized product description", () => {
    expect(classifyFuelUse("ULTRA LOW SULFUR DIESEL")).toBe("tractor")
  })

  it.each([
    "REEFER FUEL",
    "rfr",
    "Refrigeration Unit",
    "THERMO KING",
    "thermoking", // \s* between thermo/king is optional
    "reef",
  ])("classifies %j as reefer", (text) => {
    expect(classifyFuelUse(text)).toBe("reefer")
  })

  it.each(["DEF", "Diesel Exhaust Fluid", "additive", "motor OIL", "merch", "car wash", "scale"])(
    "classifies %j as other",
    (text) => {
      expect(classifyFuelUse(text)).toBe("other")
    }
  )

  it("checks reefer patterns before other patterns", () => {
    // Contains both a reefer word and an "other" word — reefer must win since
    // it is checked first in the implementation.
    expect(classifyFuelUse("reefer additive")).toBe("reefer")
  })

  it("does not misfire on partial word matches (word-boundary patterns)", () => {
    expect(classifyFuelUse("REEFERENCE")).toBe("tractor")
  })
})

describe("aggregateTaxPaidGallons", () => {
  it("sums tractor gallons per jurisdiction, excluding reefer and other", () => {
    const rows: FuelRowForIfta[] = [
      { jurisdiction: "WA", gallons: 100, fuelUse: "tractor" },
      { jurisdiction: "WA", gallons: 50, fuelUse: "reefer" },
      { jurisdiction: "WA", gallons: 10, fuelUse: "other" },
      { jurisdiction: "OR", gallons: 30, fuelUse: "tractor" },
    ]
    expect(aggregateTaxPaidGallons(rows)).toEqual({ WA: 100, OR: 30 })
  })

  it("skips rows with no jurisdiction even if tractor fuel", () => {
    const rows: FuelRowForIfta[] = [
      { jurisdiction: null, gallons: 100, fuelUse: "tractor" },
      { jurisdiction: "WA", gallons: 20, fuelUse: "tractor" },
    ]
    expect(aggregateTaxPaidGallons(rows)).toEqual({ WA: 20 })
  })

  it("returns an empty object when there are no tractor rows", () => {
    const rows: FuelRowForIfta[] = [{ jurisdiction: "WA", gallons: 100, fuelUse: "reefer" }]
    expect(aggregateTaxPaidGallons(rows)).toEqual({})
  })
})

describe("propulsionGallons", () => {
  it("sums only tractor-use gallons across jurisdictions", () => {
    const rows: FuelRowForIfta[] = [
      { jurisdiction: "WA", gallons: 100, fuelUse: "tractor" },
      { jurisdiction: "OR", gallons: 40, fuelUse: "tractor" },
      { jurisdiction: "WA", gallons: 999, fuelUse: "reefer" },
      { jurisdiction: "WA", gallons: 5, fuelUse: "other" },
    ]
    expect(propulsionGallons(rows)).toBe(140)
  })

  it("returns 0 for an empty row set", () => {
    expect(propulsionGallons([])).toBe(0)
  })
})

describe("fuelSpendCents", () => {
  it("sums total_cents across rows", () => {
    expect(fuelSpendCents([{ total_cents: 5000 }, { total_cents: 2500 }])).toBe(7500)
  })

  it("treats a falsy total_cents as 0 rather than throwing or producing NaN", () => {
    expect(
      fuelSpendCents([
        { total_cents: 1000 },
        { total_cents: 0 },
        { total_cents: undefined as unknown as number },
      ])
    ).toBe(1000)
  })

  it("returns 0 for an empty array", () => {
    expect(fuelSpendCents([])).toBe(0)
  })
})

describe("netAfterFuelCents", () => {
  it("subtracts total fuel spend from revenue", () => {
    expect(netAfterFuelCents(500000, [{ total_cents: 120000 }, { total_cents: 30000 }])).toBe(350000)
  })

  it("can go negative when fuel spend exceeds revenue", () => {
    expect(netAfterFuelCents(1000, [{ total_cents: 5000 }])).toBe(-4000)
  })

  it("returns revenue unchanged when there are no fuel rows", () => {
    expect(netAfterFuelCents(250000, [])).toBe(250000)
  })
})
