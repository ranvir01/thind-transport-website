import { describe, expect, it } from "vitest"
import {
  ATS_SANDBOX_ID,
  THIND_SANDBOX_ID,
  fallbackAgingSummary,
  fallbackCandidates,
  fallbackCarriers,
  fallbackDashboardStats,
  fallbackLoads,
} from "../sandbox-fallback"

describe("no-database sandbox fallback", () => {
  it("keeps Thind and ATS as distinct sandbox carriers", () => {
    expect(fallbackCarriers).toHaveLength(2)
    expect(fallbackCarriers.map((carrier) => carrier.id)).toEqual([THIND_SANDBOX_ID, ATS_SANDBOX_ID])
    expect(fallbackCarriers.every((carrier) => carrier.environment === "sandbox")).toBe(true)
    expect(fallbackCarriers[0]).toMatchObject({ dot_number: "2523064", mc_number: "876103", phone: "(206) 765-6300" })
    expect(fallbackCarriers[1]).toMatchObject({ dot_number: "SAMPLE", mc_number: "SAMPLE", phone: "(253) 410-7259" })
  })

  it("populates all major load lifecycle statuses with cents money", () => {
    const loads = fallbackLoads(THIND_SANDBOX_ID)
    expect(loads.length).toBeGreaterThanOrEqual(10)
    expect(loads.map((load) => load.status)).toEqual(
      expect.arrayContaining(["quoted", "booked", "dispatched", "at_pickup", "in_transit", "delivered", "pod_received", "invoiced", "paid", "settled"])
    )
    for (const load of loads) {
      expect(Number.isInteger(load.linehaul_cents)).toBe(true)
      expect(Number.isInteger(load.fuel_surcharge_cents)).toBe(true)
      expect(load.carrier_id).toBe(THIND_SANDBOX_ID)
    }
  })

  it("produces useful dashboard and AR data without Postgres", () => {
    const stats = fallbackDashboardStats(ATS_SANDBOX_ID)
    expect(stats.active_loads).toBeGreaterThan(0)
    expect(Number(stats.revenue_month_cents)).toBeGreaterThan(0)
    expect(Number(stats.ar_open_cents)).toBeGreaterThan(0)

    const aging = fallbackAgingSummary(ATS_SANDBOX_ID)
    expect(aging.totalOpenCents).toBeGreaterThan(0)
    expect(aging.buckets.current).toBeGreaterThan(0)
    expect(aging.buckets["1-30"]).toBeGreaterThan(0)
  })

  it("shows deterministic ranker math for five sample candidates", () => {
    const candidates = fallbackCandidates(THIND_SANDBOX_ID)
    expect(candidates).toHaveLength(5)
    expect(candidates[0].score.score).toBe(91)
    expect(candidates[0].score.math.ratePerTotalMile).toBe("4.26")
  })
})
