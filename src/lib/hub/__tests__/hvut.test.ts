/**
 * Form 2290 HVUT — checked against the IRS rate table rather than against the
 * formula that generates it. The category letters and their dollar amounts are
 * published; if a refactor changes what Category K costs, this notices.
 */
import { describe, expect, it } from "vitest"
import {
  HVUT_MAX_CENTS,
  calculateHvut,
  fleetHvut,
  form2290DueDate,
  hvutAnnualCents,
  hvutCategory,
  monthsInTaxPeriod,
} from "../hvut"

describe("weight categories (IRS Form 2290 Schedule 1)", () => {
  it("maps the published boundaries", () => {
    expect(hvutCategory(54_999)).toBeNull() // not taxable
    expect(hvutCategory(55_000)).toBe("A")
    expect(hvutCategory(55_001)).toBe("B")
    expect(hvutCategory(56_000)).toBe("B")
    expect(hvutCategory(56_001)).toBe("C")
    expect(hvutCategory(74_001)).toBe("U")
    expect(hvutCategory(75_000)).toBe("U")
    expect(hvutCategory(75_001)).toBe("V")
    expect(hvutCategory(80_000)).toBe("V") // the ordinary tractor-trailer
  })
})

describe("annual rates match the published table", () => {
  // Spot-checked against the Form 2290 tax table, not derived from it.
  const published: [number, string, number][] = [
    [55_000, "A", 100_00],
    [56_000, "B", 122_00],
    [57_000, "C", 144_00],
    [60_000, "F", 210_00],
    [65_000, "K", 320_00],
    [70_000, "P", 430_00],
    [75_000, "U", 540_00],
    [75_001, "V", 550_00],
    [80_000, "V", 550_00],
  ]

  it.each(published)("%i lbs is Category %s at $%i cents", (lbs, category, cents) => {
    expect(hvutCategory(lbs)).toBe(category)
    expect(hvutAnnualCents(lbs)).toBe(cents)
  })

  it("stops climbing at the Category V ceiling no matter how heavy", () => {
    expect(hvutAnnualCents(200_000)).toBe(HVUT_MAX_CENTS)
    expect(hvutAnnualCents(1_000_000)).toBe(HVUT_MAX_CENTS)
  })

  it("is zero below the taxable threshold", () => {
    expect(hvutAnnualCents(54_999)).toBe(0)
    expect(hvutAnnualCents(26_000)).toBe(0)
  })
})

describe("logging vehicles pay exactly three quarters (4481(b))", () => {
  it("lands on whole cents at every category, including the half-dollars", () => {
    expect(hvutAnnualCents(55_000, true)).toBe(75_00)
    expect(hvutAnnualCents(56_000, true)).toBe(91_50) // 122.00 × 0.75
    expect(hvutAnnualCents(75_000, true)).toBe(405_00) // 540.00 × 0.75
    expect(hvutAnnualCents(80_000, true)).toBe(412_50) // 550.00 × 0.75
  })

  it("never produces a fractional cent across the whole table", () => {
    for (let lbs = 55_000; lbs <= 76_000; lbs += 1_000) {
      const cents = hvutAnnualCents(lbs, true)
      expect(Number.isInteger(cents), `fractional cents at ${lbs} lbs: ${cents}`).toBe(true)
    }
  })
})

describe("the July-June tax period", () => {
  it("counts months from first use through June", () => {
    expect(monthsInTaxPeriod(7)).toBe(12) // July — the full period
    expect(monthsInTaxPeriod(8)).toBe(11)
    expect(monthsInTaxPeriod(11)).toBe(8) // November
    expect(monthsInTaxPeriod(1)).toBe(6) // January
    expect(monthsInTaxPeriod(6)).toBe(1) // June — one month
  })

  it("rejects a month outside 1-12 rather than computing nonsense", () => {
    expect(() => monthsInTaxPeriod(0)).toThrow(/1-12/)
    expect(() => monthsInTaxPeriod(13)).toThrow(/1-12/)
    expect(() => monthsInTaxPeriod(7.5)).toThrow(/1-12/)
  })
})

describe("filing deadline: last day of the month after first use", () => {
  it("puts a July truck on August 31 — the fleet-wide deadline", () => {
    expect(form2290DueDate(7, 2026)).toBe("2026-08-31")
  })

  it("handles short months and the year boundary", () => {
    expect(form2290DueDate(9, 2026)).toBe("2026-10-31")
    expect(form2290DueDate(3, 2026)).toBe("2026-04-30")
    expect(form2290DueDate(12, 2026)).toBe("2027-01-31")
    expect(form2290DueDate(1, 2027)).toBe("2027-02-28")
    expect(form2290DueDate(1, 2028)).toBe("2028-02-29") // leap year
  })
})

describe("calculateHvut", () => {
  it("charges the full year for a July truck at 80,000 lbs", () => {
    const result = calculateHvut({ taxableGrossWeightLbs: 80_000, firstUsedMonth: 7 }, 2026)
    expect(result).toMatchObject({
      category: "V",
      taxCents: 550_00,
      annualCents: 550_00,
      monthsTaxed: 12,
      exempt: false,
      suspended: false,
      dueOn: "2026-08-31",
    })
    expect(result.explanation).toContain("full July-June period")
  })

  it("prorates a truck put in service mid-period", () => {
    // November: 8 of 12 months. 550 × 8/12 = 366.666… → $366.67.
    const result = calculateHvut({ taxableGrossWeightLbs: 80_000, firstUsedMonth: 11 }, 2026)
    expect(result.monthsTaxed).toBe(8)
    expect(result.taxCents).toBe(36_667)
    expect(result.annualCents).toBe(550_00)
    expect(result.dueOn).toBe("2026-12-31")
    expect(result.explanation).toContain("8 of 12 months")
  })

  it("puts a mid-period truck in the tax year that opened the previous July", () => {
    // First used in March belongs to the period that began the prior July, so
    // the deadline is April of the following calendar year.
    const result = calculateHvut({ taxableGrossWeightLbs: 80_000, firstUsedMonth: 3 }, 2026)
    expect(result.dueOn).toBe("2027-04-30")
    expect(result.monthsTaxed).toBe(4) // March, April, May, June
  })

  it("reports a light vehicle as exempt rather than as zero tax owed", () => {
    const result = calculateHvut({ taxableGrossWeightLbs: 26_000 }, 2026)
    expect(result.exempt).toBe(true)
    expect(result.suspended).toBe(false)
    expect(result.taxCents).toBe(0)
    expect(result.category).toBe("—")
    expect(result.explanation).toContain("no Form 2290 tax due")
  })

  it("suspends a low-mileage vehicle into Category W but still says it must be filed", () => {
    const result = calculateHvut(
      { taxableGrossWeightLbs: 80_000, expectedMiles: 4_000 },
      2026
    )
    expect(result.category).toBe("W")
    expect(result.suspended).toBe(true)
    expect(result.taxCents).toBe(0)
    // The full liability is still reported, because going over the limit
    // mid-period makes it due.
    expect(result.annualCents).toBe(550_00)
    expect(result.explanation).toContain("must still be reported")
    expect(result.explanation).toContain("$550.00")
  })

  it("uses the higher 7,500-mile limit for agricultural vehicles", () => {
    const miles = 6_000
    expect(calculateHvut({ taxableGrossWeightLbs: 80_000, expectedMiles: miles }, 2026).suspended).toBe(false)
    expect(
      calculateHvut({ taxableGrossWeightLbs: 80_000, expectedMiles: miles, agricultural: true }, 2026).suspended
    ).toBe(true)
  })

  it("treats the mileage limit as inclusive — exactly 5,000 is suspended", () => {
    expect(calculateHvut({ taxableGrossWeightLbs: 80_000, expectedMiles: 5_000 }, 2026).suspended).toBe(true)
    expect(calculateHvut({ taxableGrossWeightLbs: 80_000, expectedMiles: 5_001 }, 2026).suspended).toBe(false)
  })

  it("combines the logging rate with proration", () => {
    // 412.50 × 8/12 = 275.00 exactly.
    const result = calculateHvut(
      { taxableGrossWeightLbs: 80_000, firstUsedMonth: 11, logging: true },
      2026
    )
    expect(result.taxCents).toBe(275_00)
    expect(result.explanation).toContain("logging rate")
  })

  it("rejects a negative weight instead of returning a negative tax", () => {
    expect(() => calculateHvut({ taxableGrossWeightLbs: -1_000 }, 2026)).toThrow(/positive/)
  })
})

describe("fleetHvut", () => {
  it("totals a fifteen-truck fleet at the ordinary tractor-trailer weight", () => {
    const trucks = Array.from({ length: 15 }, (_, i) => ({ unitNumber: `${101 + i}` }))
    const { lines, totalCents, dueOn } = fleetHvut(trucks, { firstUsedMonth: 7 })

    expect(lines).toHaveLength(15)
    expect(lines.every((l) => l.result.category === "V")).toBe(true)
    expect(totalCents).toBe(15 * 550_00) // $8,250.00
    expect(dueOn?.endsWith("-08-31")).toBe(true)
  })

  it("excludes suspended units from the total but keeps them on the list to file", () => {
    const { lines, totalCents } = fleetHvut(
      [
        { unitNumber: "101" },
        { unitNumber: "102", expectedMiles: 2_000 }, // yard truck
        { unitNumber: "103" },
      ],
      { firstUsedMonth: 7 }
    )
    expect(totalCents).toBe(2 * 550_00)
    expect(lines).toHaveLength(3)
    expect(lines[1].result.suspended).toBe(true)
  })

  it("honors a per-truck weight over the fleet default", () => {
    const { lines } = fleetHvut(
      [{ unitNumber: "101", taxableGrossWeightLbs: 60_000 }, { unitNumber: "102" }],
      { firstUsedMonth: 7 }
    )
    expect(lines[0].result.category).toBe("F")
    expect(lines[0].result.taxCents).toBe(210_00)
    expect(lines[1].result.category).toBe("V")
  })

  it("returns an empty total and no deadline for an empty fleet", () => {
    expect(fleetHvut([])).toEqual({ lines: [], totalCents: 0, dueOn: null })
  })
})
