/**
 * staleRateJurisdictions: a computed report bakes each line's rate into the
 * report JSON; if the rates on file for the quarter are later re-imported
 * with different values, the report is stale and must be recomputed before
 * filing. Jurisdictions with no rate on file are missingRates' problem, not
 * staleness — they must not be double-reported here.
 */
import { describe, expect, it } from "vitest"
import { staleRateJurisdictions } from "@/lib/hub/ifta-core"

const row = (jurisdiction: string, rate: number, surchargeRate = 0) => ({
  jurisdiction,
  rate,
  surchargeRate,
})

describe("staleRateJurisdictions", () => {
  it("returns nothing when rates on file match the report", () => {
    const rows = [row("WA", 0.494), row("IN", 0.55, 0.11)]
    const rates = {
      WA: { rate: 0.494 },
      IN: { rate: 0.55, surchargeRate: 0.11 },
    }
    expect(staleRateJurisdictions(rows, rates)).toEqual([])
  })

  it("flags a jurisdiction whose base rate changed after compute", () => {
    const rows = [row("WA", 0.449), row("OR", 0)]
    const rates = { WA: { rate: 0.494 }, OR: { rate: 0 } }
    expect(staleRateJurisdictions(rows, rates)).toEqual(["WA"])
  })

  it("flags a surcharge-only change", () => {
    const rows = [row("IN", 0.55, 0.11)]
    const rates = { IN: { rate: 0.55, surchargeRate: 0.21 } }
    expect(staleRateJurisdictions(rows, rates)).toEqual(["IN"])
  })

  it("flags a rate imported for a line the compute zeroed as missing", () => {
    // computeIfta writes rate 0 for a missing-rate jurisdiction; importing the
    // rate later without recomputing leaves that line understated.
    const rows = [row("NV", 0)]
    const rates = { NV: { rate: 0.27 } }
    expect(staleRateJurisdictions(rows, rates)).toEqual(["NV"])
  })

  it("ignores jurisdictions with no rate on file (missingRates path)", () => {
    const rows = [row("ID", 0)]
    expect(staleRateJurisdictions(rows, {})).toEqual([])
  })

  it("treats an absent surcharge on file as zero", () => {
    const rows = [row("WA", 0.494, 0)]
    const rates = { WA: { rate: 0.494, surchargeRate: undefined } }
    expect(staleRateJurisdictions(rows, rates)).toEqual([])
  })

  it("does not flag float noise below a tenth of a micro-dollar", () => {
    const rows = [row("WA", 0.1 + 0.2)]
    const rates = { WA: { rate: 0.3 } }
    expect(staleRateJurisdictions(rows, rates)).toEqual([])
  })
})
