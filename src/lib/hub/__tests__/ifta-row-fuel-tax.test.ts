/**
 * iftaRowFuelTaxCents: the on-screen worksheet, PDF, and CSV exports all need
 * the base fuel tax split out from the surcharge (IN/KY/VA returns require
 * them as separate lines). Current rows carry taxCents/surchargeCents
 * directly; rows from before that split only carry the combined netCents.
 */
import { describe, expect, it } from "vitest"
import { iftaRowFuelTaxCents } from "@/lib/hub/ifta-core"

describe("iftaRowFuelTaxCents", () => {
  it("returns taxCents directly when present", () => {
    expect(iftaRowFuelTaxCents({ taxCents: 1234, surchargeCents: 500, netCents: 1734 })).toBe(1234)
  })

  it("falls back to netCents minus surchargeCents for legacy rows with no taxCents", () => {
    expect(iftaRowFuelTaxCents({ surchargeCents: 500, netCents: 1734 })).toBe(1234)
  })

  it("falls back to the full netCents when neither taxCents nor surchargeCents is present", () => {
    expect(iftaRowFuelTaxCents({ netCents: -786 })).toBe(-786)
  })

  it("treats a missing netCents as zero", () => {
    expect(iftaRowFuelTaxCents({})).toBe(0)
  })
})
