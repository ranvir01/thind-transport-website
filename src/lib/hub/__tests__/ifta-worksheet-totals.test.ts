/**
 * iftaWorksheetTotals: column totals for the worksheet table. A state IFTA
 * return asks for total taxable gallons, tax-paid gallons, and tax as its own
 * summary lines, so the worksheet screen (and any export) needs the columns
 * summed. Base tax uses iftaRowFuelTaxCents so legacy rows (pre
 * taxCents/surchargeCents split) still total correctly.
 */
import { describe, expect, it } from "vitest"
import { computeIfta, iftaWorksheetTotals } from "@/lib/hub/ifta-core"

describe("iftaWorksheetTotals", () => {
  it("empty rows total to all zeros", () => {
    expect(iftaWorksheetTotals([])).toEqual({
      miles: 0, taxableGallons: 0, taxPaidGallons: 0, taxCents: 0, surchargeCents: 0, netCents: 0,
    })
  })

  it("sums each column across jurisdictions, base tax separate from surcharge", () => {
    const totals = iftaWorksheetTotals([
      { miles: 4000, taxableGallons: 571.429, taxPaidGallons: 600, taxCents: -1411, surchargeCents: 0, netCents: -1411 },
      { miles: 2000, taxableGallons: 285.714, taxPaidGallons: 300, taxCents: -786, surchargeCents: 3143, netCents: 2357 },
    ])
    expect(totals.miles).toBe(6000)
    expect(totals.taxableGallons).toBeCloseTo(857.143, 3)
    expect(totals.taxPaidGallons).toBe(900)
    expect(totals.taxCents).toBe(-2197) // base fuel tax only, surcharge excluded
    expect(totals.surchargeCents).toBe(3143)
    expect(totals.netCents).toBe(946)
  })

  it("nets to the same total the compute produced (golden fixture)", () => {
    const report = computeIfta({
      milesByJurisdiction: { WA: 4000, ID: 1000, IN: 2000 },
      gallonsByJurisdiction: { WA: 600, ID: 100, IN: 300 },
      rates: { WA: { rate: 0.494 }, ID: { rate: 0.33 }, IN: { rate: 0.55, surchargeRate: 0.11 } },
    })
    const totals = iftaWorksheetTotals(report.rows)
    expect(totals.netCents).toBe(report.netTaxCents) // $23.60
    expect(totals.miles).toBe(7000)
    // Base tax + surcharge reconciles to net across the whole quarter.
    expect(totals.taxCents + totals.surchargeCents).toBe(totals.netCents)
  })

  it("totals base tax from legacy rows that carry only netCents + surchargeCents", () => {
    const totals = iftaWorksheetTotals([
      { miles: 100, taxableGallons: 14.3, taxPaidGallons: 20, surchargeCents: 500, netCents: 1734 },
    ])
    expect(totals.taxCents).toBe(1234) // 1734 net − 500 surcharge
    expect(totals.surchargeCents).toBe(500)
    expect(totals.netCents).toBe(1734)
  })
})
