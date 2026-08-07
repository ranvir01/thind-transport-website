/**
 * P2.5: carrier_settings.pay.companyDriverPerMile was fractional dollars —
 * the single most-carried item in the backlog (60 occurrences) and a standing
 * violation of AGENTS.md's "money is integer cents everywhere".
 *
 * Live loss was ~$0 because pay-rules.ts absorbed it with
 * Math.round(rate * 100). The cost was that every new consumer had to remember
 * the unit, and a half-cent rate had no representation at all — which is what
 * the boundary cases below pin.
 */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { legacyConfigToRuleSet } from "../pay-rules"

const { queryOneMock } = vi.hoisted(() => ({ queryOneMock: vi.fn(async () => null as unknown) }))
vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: queryOneMock, hubDb: vi.fn() }))

import { getCarrierSettings, DEFAULT_SETTINGS } from "../settings"

beforeEach(() => queryOneMock.mockReset())

describe("the default is cents, and it is an integer", () => {
  it("DEFAULT_SETTINGS carries integer cents, not dollars", () => {
    expect(DEFAULT_SETTINGS.pay.companyDriverPerMileCents).toBe(60)
    expect(Number.isInteger(DEFAULT_SETTINGS.pay.companyDriverPerMileCents)).toBe(true)
  })
})

describe("getCarrierSettings reads either shape", () => {
  it("passes through a stored cents value", async () => {
    queryOneMock.mockResolvedValue({ settings: { pay: { companyDriverPerMileCents: 72 } } })
    const s = await getCarrierSettings("carrier-1")
    expect(s.pay.companyDriverPerMileCents).toBe(72)
  })

  it("converts a legacy fractional-dollar row rather than silently defaulting", async () => {
    // The dangerous failure: falling back to 60c would quietly re-rate every
    // driver imported afterwards for a tenant that had chosen 68c.
    queryOneMock.mockResolvedValue({ settings: { pay: { companyDriverPerMile: 0.68 } } })
    const s = await getCarrierSettings("carrier-1")
    expect(s.pay.companyDriverPerMileCents).toBe(68)
  })

  it("prefers the new key when a half-migrated row carries both", async () => {
    queryOneMock.mockResolvedValue({
      settings: { pay: { companyDriverPerMile: 0.5, companyDriverPerMileCents: 68 } },
    })
    const s = await getCarrierSettings("carrier-1")
    expect(s.pay.companyDriverPerMileCents).toBe(68)
  })

  it("falls back to the default only when neither key is present", async () => {
    queryOneMock.mockResolvedValue({ settings: { pay: { payLoadedMilesOnly: false } } })
    const s = await getCarrierSettings("carrier-1")
    expect(s.pay.companyDriverPerMileCents).toBe(60)
    expect(s.pay.payLoadedMilesOnly).toBe(false)
  })
})

describe("the half-cent boundary the dollar shape could not express", () => {
  // hub.drivers.pay_rate is still fractional dollars (its own conversion is a
  // separate migration), so legacyConfigToRuleSet still rounds. These pin what
  // that rounding does, so the day the column is converted the change in
  // behaviour is visible rather than silent.
  const perMile = (payRate: number) =>
    legacyConfigToRuleSet({
      payType: "per_mile", payRate, payLoadedMilesOnly: true,
      escrowWeeklyCents: 0, insuranceWeeklyCents: 0,
    }).rules.find((r) => r.type === "per_mile") as { rateCentsPerMile: number }

  it("rounds a half cent up, and always yields an integer", () => {
    expect(perMile(0.625).rateCentsPerMile).toBe(63)
    expect(perMile(0.615).rateCentsPerMile).toBe(62)
    for (const rate of [0.6, 0.625, 0.68, 0.7249, 1.005]) {
      expect(Number.isInteger(perMile(rate).rateCentsPerMile)).toBe(true)
    }
  })

  it("keeps the half cent when the binary-float product drifts LOW (2026-08 audit)", () => {
    // 0.565 * 100 = 56.49999999999999 in IEEE-754: a bare Math.round pays a
    // $0.565/mi driver 56c on every settled mile. The earlier pins (0.625,
    // 0.615) only cover ties whose drift lands high.
    expect(perMile(0.565).rateCentsPerMile).toBe(57)
    expect(perMile(0.575).rateCentsPerMile).toBe(58)
    expect(perMile(0.145).rateCentsPerMile).toBe(15)
    expect(perMile(1.005).rateCentsPerMile).toBe(101)
  })

  it("survives binary-float rates that do not land on a cent", () => {
    // 0.29 * 100 === 28.999999999999996 in IEEE 754; a truncating conversion
    // would pay 28c/mile instead of 29.
    expect(perMile(0.29).rateCentsPerMile).toBe(29)
    expect(perMile(0.57).rateCentsPerMile).toBe(57)
  })

  it("a percentage rule converts to basis points, not cents", () => {
    const rules = legacyConfigToRuleSet({
      payType: "percentage", payRate: 0.88, payLoadedMilesOnly: true,
      escrowWeeklyCents: 0, insuranceWeeklyCents: 0,
    }).rules
    expect(rules.find((r) => r.type === "percent_linehaul")).toMatchObject({ basisPoints: 8800 })
  })
})
