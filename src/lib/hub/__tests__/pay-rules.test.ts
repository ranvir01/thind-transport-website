import { describe, expect, it } from "vitest"
import { computeSettlement } from "../money"
import {
  evaluatePayRules, legacyConfigToRuleSet, parseRuleSet,
  type PayLoadContext, type PayRuleSet,
} from "../pay-rules"

const load = (overrides: Partial<PayLoadContext> = {}): PayLoadContext => ({
  id: "l1",
  reference: "REF-1",
  linehaulCents: 200000,
  fuelSurchargeCents: 25000,
  accessorialCents: 0,
  loadedMiles: 500,
  deadheadMiles: 50,
  stopsCount: 2,
  ...overrides,
})

const noExtras = { reimbursements: [], outstandingAdvances: [] }

describe("pay-rules evaluator — the generic settlement seam", () => {
  it("per_mile pays loaded miles only by default", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "per_mile", rateCentsPerMile: 63 }], deductions: [] },
      { loads: [load()], ...noExtras }
    )
    expect(draft.grossCents).toBe(31500) // 500 × 63¢
  })

  it("per_mile pays all miles when loadedOnly=false", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "per_mile", rateCentsPerMile: 63, loadedOnly: false }], deductions: [] },
      { loads: [load()], ...noExtras }
    )
    expect(draft.grossCents).toBe(34650) // 550 × 63¢
  })

  it("percent_linehaul includes accessorials and rounds half away from zero", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "percent_linehaul", basisPoints: 9000 }], deductions: [] },
      { loads: [load({ linehaulCents: 12345, fuelSurchargeCents: 0 })], ...noExtras }
    )
    expect(draft.grossCents).toBe(11111) // 0.9 × 12345 = 11110.5 → 11111
  })

  it("percent_total pays on linehaul + FSC + accessorials", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "percent_total", basisPoints: 7500 }], deductions: [] },
      { loads: [load({ linehaulCents: 100000, fuelSurchargeCents: 20000, accessorialCents: 10000 })], ...noExtras }
    )
    expect(draft.grossCents).toBe(97500) // 75% × $1,300.00
  })

  it("fsc_passthrough at 100% adds the exact surcharge", () => {
    const draft = evaluatePayRules(
      {
        name: "t",
        rules: [
          { type: "percent_linehaul", basisPoints: 9000 },
          { type: "fsc_passthrough", basisPoints: 10000 },
        ],
        deductions: [],
      },
      { loads: [load({ linehaulCents: 250000, accessorialCents: 15000, fuelSurchargeCents: 30000 })], ...noExtras }
    )
    // 90% × $2,650.00 = $2,385.00 + $300.00 FSC
    expect(draft.grossCents).toBe(268500)
  })

  it("flat_per_load and per_stop extra-stop pay", () => {
    const draft = evaluatePayRules(
      {
        name: "t",
        rules: [
          { type: "flat_per_load", amountCents: 40000 },
          { type: "per_stop", amountCents: 2500, afterStops: 2 },
        ],
        deductions: [],
      },
      { loads: [load({ stopsCount: 4 })], ...noExtras }
    )
    // $400.00 flat + 2 extra stops × $25.00
    expect(draft.grossCents).toBe(45000)
    expect(draft.lines.filter((l) => l.kind === "earning")).toHaveLength(2)
  })

  it("percent_of_gross deduction computes after all earnings and reimbursements", () => {
    const draft = evaluatePayRules(
      {
        name: "t",
        rules: [{ type: "per_mile", rateCentsPerMile: 100 }],
        deductions: [{ kind: "percent_of_gross", basisPoints: 300, label: "Admin fee" }],
      },
      {
        loads: [load({ loadedMiles: 1000 })], // $1,000.00
        reimbursements: [{ label: "Scale ticket", amountCents: 1500 }],
        outstandingAdvances: [],
      }
    )
    expect(draft.grossCents).toBe(101500)
    expect(draft.deductionsCents).toBe(3045) // 3% × $1,015.00
    expect(draft.netCents).toBe(98455)
  })

  it("recurring deductions skip empty periods", () => {
    const draft = evaluatePayRules(
      {
        name: "t",
        rules: [{ type: "per_mile", rateCentsPerMile: 63 }],
        deductions: [{ kind: "escrow", amountCents: 5000 }],
      },
      { loads: [], ...noExtras }
    )
    expect(draft.deductionsCents).toBe(0)
    expect(draft.netCents).toBe(0)
  })

  it("referral bonuses pay through the rule, never implicitly", () => {
    const ctx = {
      loads: [load()],
      reimbursements: [],
      outstandingAdvances: [],
      referralBonuses: [{ label: "Referral bonus — Maria G (hired)", amountCents: 50000, sourceId: "r1" }],
    }
    const without = evaluatePayRules(
      { name: "t", rules: [{ type: "per_mile", rateCentsPerMile: 63 }], deductions: [] },
      ctx
    )
    expect(without.grossCents).toBe(31500) // no referral rule → no bonus line
    const withRule = evaluatePayRules(
      { name: "t", rules: [{ type: "per_mile", rateCentsPerMile: 63 }, { type: "referral_bonus" }], deductions: [] },
      ctx
    )
    expect(withRule.grossCents).toBe(81500)
    expect(withRule.lines.find((l) => l.sourceType === "referral")?.amountCents).toBe(50000)
  })

  it("scorecard_bonus picks the highest tier the score clears", () => {
    const ruleSet: PayRuleSet = {
      name: "t",
      rules: [
        { type: "per_mile", rateCentsPerMile: 63 },
        { type: "scorecard_bonus", tiers: [
          { minScore: 90, amountCents: 20000 },
          { minScore: 80, amountCents: 10000 },
        ]},
      ],
      deductions: [],
    }
    const gold = evaluatePayRules(ruleSet, { loads: [load()], ...noExtras, scorecardScore: 93 })
    expect(gold.grossCents).toBe(31500 + 20000)
    const silver = evaluatePayRules(ruleSet, { loads: [load()], ...noExtras, scorecardScore: 84 })
    expect(silver.grossCents).toBe(31500 + 10000)
    const none = evaluatePayRules(ruleSet, { loads: [load()], ...noExtras, scorecardScore: 60 })
    expect(none.grossCents).toBe(31500)
  })

  it("advances always deduct, even period-only", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "per_mile", rateCentsPerMile: 63 }], deductions: [] },
      {
        loads: [load()],
        reimbursements: [],
        outstandingAdvances: [{ id: "a1", reference: "EFS 1234", amountCents: 20000 }],
      }
    )
    expect(draft.deductionsCents).toBe(20000)
    expect(draft.netCents).toBe(11500)
  })
})

describe("legacy bridge — old config and new evaluator settle identically", () => {
  const loads = [
    load({ id: "a", reference: "T-1", linehaulCents: 210000, fuelSurchargeCents: 20000, loadedMiles: 520, deadheadMiles: 40 }),
    load({ id: "b", reference: "T-2", linehaulCents: 195000, fuelSurchargeCents: 18000, loadedMiles: 480, deadheadMiles: 25 }),
  ]

  it("company driver: computeSettlement === evaluatePayRules(legacy conversion)", () => {
    const config = {
      payType: "per_mile" as const, payRate: 0.63, payLoadedMilesOnly: true,
      escrowWeeklyCents: 5000, insuranceWeeklyCents: 7500,
    }
    const legacy = computeSettlement(loads, config, [], [])
    const direct = evaluatePayRules(legacyConfigToRuleSet(config), { loads, ...noExtras })
    expect(legacy).toEqual(direct)
    expect(legacy.grossCents).toBe(63000) // 520×63 + 480×63
    expect(legacy.deductionsCents).toBe(12500)
  })

  it("owner-operator: 90% + FSC passthrough matches to the penny", () => {
    const config = {
      payType: "percentage" as const, payRate: 0.9, payLoadedMilesOnly: true,
      escrowWeeklyCents: 10000, insuranceWeeklyCents: 0,
    }
    const legacy = computeSettlement(loads, config, [], [])
    const direct = evaluatePayRules(legacyConfigToRuleSet(config), { loads, ...noExtras })
    expect(legacy).toEqual(direct)
    // 0.9×2100.00 + 200.00 + 0.9×1950.00 + 180.00 = 1890+200+1755+180
    expect(legacy.grossCents).toBe(402500)
    expect(legacy.netCents).toBe(392500)
  })
})

describe("parseRuleSet — defensive JSONB parse", () => {
  it("tolerates malformed rows", () => {
    const parsed = parseRuleSet({ name: "x", rules: "garbage", deductions: null })
    expect(parsed.rules).toEqual([])
    expect(parsed.deductions).toEqual([])
  })
})
