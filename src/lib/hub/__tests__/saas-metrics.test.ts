/**
 * SaaS metrics — every figure hand-computed from the definitions pinned in
 * saas-metrics.ts. The scenario is three tenants across two months plus a
 * year-ago anchor: one expands, one downgrades, one churns, one is brand new
 * — which exercises NRR's cohort exclusion, churn, ARPU and Rule of 40 in a
 * single dataset.
 */
import { describe, expect, it } from "vitest"
import { cacPaybackMonths, computeSaasMonth, type BillingRow } from "../saas-metrics"

// Per-truck pricing at $30/truck/month (3000¢) unless noted.
const ROWS: BillingRow[] = [
  // Year-ago anchor for Rule of 40: total 60000¢.
  { carrierId: "thind", month: "2025-07", billedCents: 45000, trucks: 15 },
  { carrierId: "ats", month: "2025-07", billedCents: 15000, trucks: 5 },

  // June 2026: three logos, 26 trucks, 78000¢ total.
  { carrierId: "thind", month: "2026-06", billedCents: 45000, trucks: 15 },
  { carrierId: "ats", month: "2026-06", billedCents: 15000, trucks: 5 },
  { carrierId: "cascade", month: "2026-06", billedCents: 18000, trucks: 6 },

  // July 2026: thind expands to 18 trucks, ats downgrades to 3, cascade
  // churns, and a NEW logo (bluebird) signs — excluded from NRR by design.
  { carrierId: "thind", month: "2026-07", billedCents: 54000, trucks: 18 },
  { carrierId: "ats", month: "2026-07", billedCents: 9000, trucks: 3 },
  { carrierId: "bluebird", month: "2026-07", billedCents: 24000, trucks: 8 },
]

describe("computeSaasMonth", () => {
  const july = computeSaasMonth(ROWS, "2026-07", { operatingMarginPct: 12 })

  it("MRR sums the month's billing", () => {
    expect(july.mrrCents).toBe(54000 + 9000 + 24000) // 87000
  })

  it("ARPU is per truck, not per logo", () => {
    // 87000¢ / 29 trucks = 3000¢
    expect(july.billedTrucks).toBe(29)
    expect(july.arpuPerTruckCents).toBe(3000)
  })

  it("NRR counts only last month's cohort: expansion minus downgrade minus churn", () => {
    // June cohort billed 78000. In July that cohort pays 54000 + 9000 = 63000.
    // Bluebird's 24000 is NEW revenue and must not rescue retention.
    expect(july.nrrPct).toBe(round(63000 / 78000)) // 80.8
  })

  it("logo churn: one of three June logos vanished", () => {
    expect(july.logoChurnPct).toBe(33.3)
  })

  it("Rule of 40 = YoY growth + margin", () => {
    // 87000 vs 60000 a year ago = +45% growth, +12 margin = 57.
    expect(july.ruleOf40).toBe(57)
  })

  it("first recorded month has no NRR, churn, or Rule of 40 — null, not fake 100s", () => {
    const juneOnly = computeSaasMonth(ROWS.filter((r) => r.month === "2026-06"), "2026-06")
    expect(juneOnly.nrrPct).toBeNull()
    expect(juneOnly.logoChurnPct).toBeNull()
    expect(juneOnly.ruleOf40).toBeNull()
  })

  it("a month with no billing reports zeros and null ARPU", () => {
    const empty = computeSaasMonth(ROWS, "2026-09")
    expect(empty.mrrCents).toBe(0)
    expect(empty.arpuPerTruckCents).toBeNull()
  })

  function round(ratio: number): number {
    return Math.round(ratio * 1000) / 10
  }
})

describe("cacPaybackMonths", () => {
  it("computes months from spend, logos, revenue and margin", () => {
    // $1,200 spend / 2 logos = $600 CAC; $180/mo per logo at 80% margin =
    // $144/mo contribution → 600/144 = 4.2 months (SMB self-serve tier).
    expect(
      cacPaybackMonths({
        acquisitionSpendCents: 120000,
        newLogos: 2,
        monthlyRevenuePerLogoCents: 18000,
        grossMarginPct: 80,
      })
    ).toBe(4.2)
  })

  it("never returns Infinity — no logos or no revenue is null", () => {
    expect(cacPaybackMonths({ acquisitionSpendCents: 1, newLogos: 0, monthlyRevenuePerLogoCents: 1, grossMarginPct: 80 })).toBeNull()
    expect(cacPaybackMonths({ acquisitionSpendCents: 1, newLogos: 1, monthlyRevenuePerLogoCents: 0, grossMarginPct: 80 })).toBeNull()
    expect(cacPaybackMonths({ acquisitionSpendCents: 1, newLogos: 1, monthlyRevenuePerLogoCents: 1, grossMarginPct: 0 })).toBeNull()
  })
})
