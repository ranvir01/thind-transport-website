import { describe, expect, it } from "vitest"
import { computeRiskScore } from "../vetting-shared"

describe("broker risk score", () => {
  it("revoked authority is an automatic walk-away", () => {
    const { score, reasons } = computeRiskScore({
      allowedToOperate: false, authorityStatus: "ACTIVE", nameMatches: true,
      avgDaysToPay: 20, paymentTermsDays: 30,
    })
    expect(score).toBe(5)
    expect(reasons[0]).toMatch(/do not book/i)
  })

  it("active authority + fast payer scores high", () => {
    const { score } = computeRiskScore({
      allowedToOperate: true, authorityStatus: "A", nameMatches: true,
      avgDaysToPay: 22, paymentTermsDays: 30,
    })
    expect(score).toBe(100) // 70 + 20 + 10
  })

  it("name mismatch knocks 25 points (double-broker tell)", () => {
    const matched = computeRiskScore({
      allowedToOperate: true, authorityStatus: "A", nameMatches: true,
      avgDaysToPay: null, paymentTermsDays: 30,
    })
    const mismatched = computeRiskScore({
      allowedToOperate: true, authorityStatus: "A", nameMatches: false,
      avgDaysToPay: null, paymentTermsDays: 30,
    })
    expect(matched.score - mismatched.score).toBe(25)
    expect(mismatched.reasons.join(" ")).toMatch(/double-brokering/i)
  })

  it("slow payer (terms + 15) costs 20 points", () => {
    const { score, reasons } = computeRiskScore({
      allowedToOperate: true, authorityStatus: "A", nameMatches: true,
      avgDaysToPay: 50, paymentTermsDays: 30,
    })
    expect(score).toBe(70) // 70 + 20 − 20
    expect(reasons.join(" ")).toMatch(/slow payer/i)
  })

  it("unverified stays at the cautious baseline", () => {
    const { score, reasons } = computeRiskScore({
      allowedToOperate: null, authorityStatus: null, nameMatches: null,
      avgDaysToPay: null, paymentTermsDays: 30,
    })
    expect(score).toBe(70)
    expect(reasons.join(" ")).toMatch(/not verified/i)
  })

  it("revoked-status text penalizes even when allowed flag is missing", () => {
    const { score } = computeRiskScore({
      allowedToOperate: null, authorityStatus: "REVOKED", nameMatches: null,
      avgDaysToPay: null, paymentTermsDays: 30,
    })
    expect(score).toBe(30) // 70 − 40
  })

  it("score is clamped to 0..100", () => {
    const low = computeRiskScore({
      allowedToOperate: null, authorityStatus: "REVOKED", nameMatches: false,
      avgDaysToPay: 90, paymentTermsDays: 30,
    })
    expect(low.score).toBeGreaterThanOrEqual(0)
    const high = computeRiskScore({
      allowedToOperate: true, authorityStatus: "A", nameMatches: true,
      avgDaysToPay: 10, paymentTermsDays: 30,
    })
    expect(high.score).toBeLessThanOrEqual(100)
  })
})
