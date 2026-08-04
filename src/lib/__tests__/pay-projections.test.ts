/**
 * The 5-year projection card must move when PAY_RATES moves — these tests
 * compute the expected figures from the SAME constants the site publishes,
 * so they hold under any future rate change, and fail loudly if the range
 * format drifts away from what the parser understands.
 */
import { describe, expect, it } from "vitest"
import { fiveYearProjection, parseAnnualRange } from "../pay-projections"
import { PAY_RATES } from "../constants"

describe("parseAnnualRange", () => {
  it("reads the two published range formats", () => {
    expect(parseAnnualRange("$69K-$82K")).toEqual([69000, 82000])
    expect(parseAnnualRange("$150K-$250K")).toEqual([150000, 250000])
  })

  it("throws on a shape it does not understand instead of guessing", () => {
    expect(() => parseAnnualRange("$70,000 to $80,000")).toThrow(/unrecognized/)
    expect(() => parseAnnualRange("competitive")).toThrow(/unrecognized/)
  })
})

describe("fiveYearProjection", () => {
  const p = fiveYearProjection()
  const [cLow, cHigh] = parseAnnualRange(PAY_RATES.companyDriver.otr.annual)
  const [oLow, oHigh] = parseAnnualRange(PAY_RATES.ownerOperator.annualGross)

  it("is exactly the published annual ranges times five", () => {
    expect(p.companyOtr.low).toBe(cLow * 5)
    expect(p.companyOtr.high).toBe(cHigh * 5)
    expect(p.ownerOperator.low).toBe(oLow * 5)
    expect(p.ownerOperator.high).toBe(oHigh * 5)
  })

  it("advantage percent comes from range midpoints, not cherry-picked ends", () => {
    const expected = Math.round(((oLow + oHigh) / (cLow + cHigh) - 1) * 100)
    expect(p.ooAdvantagePct).toBe(expected)
  })

  it("labels are compact dollars with an M crossover", () => {
    // At today's constants: $345K–$410K and $750K–$1.25M.
    expect(p.companyOtr.label).toBe("$345K–$410K")
    expect(p.ownerOperator.label).toBe("$750K–$1.25M")
  })

  it("the company bar is proportional, not eyeballed", () => {
    expect(p.companyBarPct).toBe(Math.round((cHigh * 5 * 100) / (oHigh * 5)))
  })
})
