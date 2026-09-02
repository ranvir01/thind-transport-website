/**
 * The per-mile columns on /hub/reports. The one rule that matters is the null:
 * a row with no miles has no rate, and "∞" or "$0.00 cost per mile" would read
 * as a win for a truck that never left the yard.
 */
import { describe, expect, it } from "vitest"
import { fmtPerMile, perMile } from "../pnl-per-mile"

const TRUCK = {
  revenue_cents: "620000", // $6,200
  fuel_cents: "110000",
  maintenance_cents: "20000",
  toll_cents: "5000",
  other_expense_cents: "15000",
  loaded_miles: "2000",
  deadhead_miles: "500",
}

describe("perMile", () => {
  it("prices revenue per LOADED mile and cost per TOTAL mile", () => {
    const pm = perMile(TRUCK)!
    expect(pm.loadedMiles).toBe(2000)
    expect(pm.totalMiles).toBe(2500)
    expect(pm.rpmCents).toBe(310) // 620000 / 2000
    expect(pm.operatingCpmCents).toBe(60) // 150000 / 2500 — deadhead burns fuel too
    expect(pm.marginPerMileCents).toBe(188) // (620000 - 150000) / 2500
  })

  it("is null with no miles at all — no rate for a truck that sat in the yard", () => {
    expect(perMile({ ...TRUCK, loaded_miles: null, deadhead_miles: null })).toBeNull()
    expect(perMile({ ...TRUCK, loaded_miles: "0", deadhead_miles: "0" })).toBeNull()
  })

  it("has a cost per mile but no RPM when the only miles were deadhead", () => {
    const pm = perMile({ ...TRUCK, loaded_miles: "0", deadhead_miles: "300", revenue_cents: "0" })!
    expect(pm.rpmCents).toBeNull()
    expect(pm.operatingCpmCents).toBe(500)
    expect(pm.marginPerMileCents).toBe(-500)
  })

  it("treats unknown pay as unknown, never as zero", () => {
    const unknown = perMile({ revenue_cents: "100000", loaded_miles: "1000", deadhead_miles: "0" })!
    expect(unknown.payCpmCents).toBeNull()
    expect(unknown.marginPerMileCents).toBe(100)
    const known = perMile({ revenue_cents: "100000", loaded_miles: "1000", deadhead_miles: "0", pay_cents: "60000" })!
    expect(known.payCpmCents).toBe(60)
    expect(known.marginPerMileCents).toBe(40)
  })

  it("accepts numbers or the strings pg returns for bigint sums", () => {
    expect(perMile({ revenue_cents: 250000, loaded_miles: 1000, deadhead_miles: 250 })!.rpmCents).toBe(250)
    expect(perMile({ revenue_cents: "250000", loaded_miles: "1000", deadhead_miles: "250" })!.rpmCents).toBe(250)
  })
})

describe("fmtPerMile", () => {
  it("formats dollars and dashes the unknown", () => {
    expect(fmtPerMile(214)).toBe("$2.14")
    expect(fmtPerMile(-50)).toBe("$-0.50")
    expect(fmtPerMile(null)).toBe("—")
  })
})
