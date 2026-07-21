import { describe, expect, it } from "vitest"
import { computeIfta, iftaDueDate, lastCompletedQuarterKey, quarterKey, quarterRange } from "../ifta-core"
import { haversineMiles, jurisdictionMilesFromPings, stateForPoint } from "../geo"

describe("IFTA golden fixture (hand-computed, surcharge state included)", () => {
  // Fleet quarter: WA 4,000 mi / ID 1,000 mi / IN 2,000 mi = 7,000 mi.
  // Tax-paid gallons: WA 600 / ID 100 / IN 300 = 1,000 gal. MPG = 7.0000.
  //
  // WA: taxable 4000/7 = 571.428571 gal; (571.428571 − 600) × $0.4940 = −$14.114286 → −$14.11
  // ID: taxable 142.857143 gal; (142.857143 − 100) × $0.3300 = $14.142857 → $14.14
  // IN: taxable 285.714286 gal; (285.714286 − 300) × $0.5500 = −$7.857143 → −$7.86
  // IN surcharge (NO tax-paid credit): 285.714286 × $0.1100 = $31.428571 → $31.43
  // Net total: −14.11 + 14.14 − 7.86 + 31.43 = $23.60
  const result = computeIfta({
    milesByJurisdiction: { WA: 4000, ID: 1000, IN: 2000 },
    gallonsByJurisdiction: { WA: 600, ID: 100, IN: 300 },
    rates: {
      WA: { rate: 0.494 },
      ID: { rate: 0.33 },
      IN: { rate: 0.55, surchargeRate: 0.11 },
    },
  })

  it("fleet totals and MPG", () => {
    expect(result.fleetMiles).toBe(7000)
    expect(result.fleetGallons).toBe(1000)
    expect(result.mpg).toBe(7)
  })

  it("per-jurisdiction net tax to the penny", () => {
    const byJur = Object.fromEntries(result.rows.map((r) => [r.jurisdiction, r]))
    expect(byJur.WA.taxCents).toBe(-1411)
    expect(byJur.WA.surchargeCents).toBe(0)
    expect(byJur.ID.taxCents).toBe(1414)
    expect(byJur.IN.taxCents).toBe(-786)
    expect(byJur.IN.surchargeCents).toBe(3143)
    expect(byJur.IN.netCents).toBe(2357)
  })

  it("quarter net total to the penny", () => {
    expect(result.netTaxCents).toBe(2360) // $23.60 due
  })

  it("flags jurisdictions traveled without a rate on file", () => {
    const withMissing = computeIfta({
      milesByJurisdiction: { WA: 100, MT: 50 },
      gallonsByJurisdiction: { WA: 20 },
      rates: { WA: { rate: 0.494 } },
    })
    expect(withMissing.missingRates).toEqual(["MT"])
  })

  it("flags purchases-only jurisdictions without a rate on file", () => {
    // Fuel bought in CA but no CA miles pinged: without a rate the tax-paid
    // credit silently becomes $0, so the missing rate must still be surfaced.
    const withMissing = computeIfta({
      milesByJurisdiction: { WA: 100 },
      gallonsByJurisdiction: { WA: 20, CA: 30 },
      rates: { WA: { rate: 0.494 } },
    })
    expect(withMissing.missingRates).toEqual(["CA"])
  })
})

describe("quarter helpers", () => {
  it("quarterKey", () => {
    expect(quarterKey(new Date(Date.UTC(2026, 4, 15)))).toBe("2026Q2")
    expect(quarterKey(new Date(Date.UTC(2026, 0, 1)))).toBe("2026Q1")
    expect(quarterKey(new Date(Date.UTC(2026, 11, 31)))).toBe("2026Q4")
  })
  it("lastCompletedQuarterKey", () => {
    expect(lastCompletedQuarterKey(new Date(Date.UTC(2026, 6, 5)))).toBe("2026Q2")
    expect(lastCompletedQuarterKey(new Date(Date.UTC(2026, 8, 30)))).toBe("2026Q2")
    expect(lastCompletedQuarterKey(new Date(Date.UTC(2026, 9, 1)))).toBe("2026Q3")
    expect(lastCompletedQuarterKey(new Date(Date.UTC(2026, 1, 15)))).toBe("2025Q4")
  })
  it("quarterRange", () => {
    const { start, end } = quarterRange("2026Q2")
    expect(start.toISOString().slice(0, 10)).toBe("2026-04-01")
    expect(end.toISOString().slice(0, 10)).toBe("2026-07-01")
  })
  it("IFTA due date is the last day of the following month", () => {
    // Weekday last-days pass through unchanged: 2026-04-30 is a Thursday,
    // 2026-07-31 a Friday.
    expect(iftaDueDate("2026Q1").toISOString().slice(0, 10)).toBe("2026-04-30")
    expect(iftaDueDate("2026Q2").toISOString().slice(0, 10)).toBe("2026-07-31")
  })
  it("rolls a weekend due date forward to the next business day (IFTA P1040)", () => {
    // 2027-01-31 is a Sunday → Monday 2027-02-01.
    expect(iftaDueDate("2026Q4").toISOString().slice(0, 10)).toBe("2027-02-01")
    // 2026-01-31 is a Saturday → Monday 2026-02-02.
    expect(iftaDueDate("2025Q4").toISOString().slice(0, 10)).toBe("2026-02-02")
  })
})

describe("geo engine", () => {
  it("haversine Seattle→Portland ≈ 145 mi", () => {
    const miles = haversineMiles(47.6062, -122.3321, 45.5152, -122.6784)
    expect(miles).toBeGreaterThan(140)
    expect(miles).toBeLessThan(150)
  })

  it("point-in-state assignment", () => {
    expect(stateForPoint(47.6062, -122.3321)).toBe("WA") // Seattle
    expect(stateForPoint(45.5152, -122.6784)).toBe("OR") // Portland
    expect(stateForPoint(39.5296, -119.8138)).toBe("NV") // Reno
    expect(stateForPoint(43.615, -116.2023)).toBe("ID") // Boise
  })

  it("allocates ping-trail miles to jurisdictions", () => {
    // Seattle → Tacoma → Olympia: all inside WA
    const miles = jurisdictionMilesFromPings([
      { lat: 47.6062, lng: -122.3321, ts: "2026-04-01T08:00:00Z" },
      { lat: 47.2529, lng: -122.4443, ts: "2026-04-01T08:35:00Z" },
      { lat: 47.0379, lng: -122.9007, ts: "2026-04-01T09:10:00Z" },
    ])
    expect(Object.keys(miles)).toEqual(["WA"])
    expect(miles.WA).toBeGreaterThan(40)
    expect(miles.WA).toBeLessThan(60)
  })

  it("skips GPS-glitch segments", () => {
    const miles = jurisdictionMilesFromPings([
      { lat: 47.6062, lng: -122.3321, ts: "2026-04-01T08:00:00Z" },
      { lat: 25.7617, lng: -80.1918, ts: "2026-04-01T08:10:00Z" }, // Miami 10 min later — glitch
    ])
    expect(Object.keys(miles)).toEqual([])
  })
})
