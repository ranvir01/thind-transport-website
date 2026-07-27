import { describe, expect, it } from "vitest"
import { computeSettlement } from "../money"
import { roundHalfAwayFromZero } from "../rounding"
import {
  describePayRules, evaluatePayRules, legacyConfigToRuleSet, parseRuleSet, summarizePayRules,
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

describe("detention itemization — percent rules name the detention share", () => {
  // Auto-billed detention (applyDetentionAccrual) lands in accessorialCents;
  // detentionCents tells the evaluator how much of it to itemize by name.
  const detained = load({
    linehaulCents: 250000, fuelSurchargeCents: 30000,
    accessorialCents: 15000, detentionCents: 15000,
  })

  it("percent_linehaul splits detention into its own line, penny-identical total", () => {
    const ruleSet: PayRuleSet = { name: "t", rules: [{ type: "percent_linehaul", basisPoints: 9000 }], deductions: [] }
    const split = evaluatePayRules(ruleSet, { loads: [detained], ...noExtras })
    const blended = evaluatePayRules(ruleSet, { loads: [load({ linehaulCents: 250000, accessorialCents: 15000 })], ...noExtras })
    expect(split.grossCents).toBe(blended.grossCents) // 238500 — nobody's pay changes
    const earnings = split.lines.filter((l) => l.kind === "earning")
    expect(earnings).toHaveLength(2)
    expect(earnings[0].label).toBe("REF-1 — 90% of $2500.00")
    expect(earnings[0].amountCents).toBe(225000)
    expect(earnings[1].label).toBe("REF-1 — 90% of detention $150.00")
    expect(earnings[1].amountCents).toBe(13500)
  })

  it("percent_total itemizes detention out of the all-in base", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "percent_total", basisPoints: 7500 }], deductions: [] },
      { loads: [detained], ...noExtras }
    )
    // 75% × $2,950.00 all-in = $2,212.50 total, of which 75% × $150 = $112.50 detention
    expect(draft.grossCents).toBe(221250)
    const earnings = draft.lines.filter((l) => l.kind === "earning")
    expect(earnings.map((l) => [l.label, l.amountCents])).toEqual([
      ["REF-1 — 75% of $2800.00 (all-in)", 210000],
      ["REF-1 — 75% of detention $150.00", 11250],
    ])
  })

  it("percent_accessorials names detention apart from other accessorials", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "percent_accessorials", basisPoints: 5000 }], deductions: [] },
      { loads: [load({ accessorialCents: 25000, detentionCents: 15000 })], ...noExtras }
    )
    const earnings = draft.lines.filter((l) => l.kind === "earning")
    expect(earnings.map((l) => [l.label, l.amountCents])).toEqual([
      ["REF-1 — 50% of accessorials $100.00", 5000],
      ["REF-1 — 50% of detention $150.00", 7500],
    ])
  })

  it("split lines always sum to the unsplit rounding, even on awkward percentages", () => {
    // 66.67% of $123.45 base with $33.33 detention — both shares round.
    const ruleSet: PayRuleSet = { name: "t", rules: [{ type: "percent_linehaul", basisPoints: 6667 }], deductions: [] }
    const awkward = load({ linehaulCents: 9012, fuelSurchargeCents: 0, accessorialCents: 3333, detentionCents: 3333 })
    const split = evaluatePayRules(ruleSet, { loads: [awkward], ...noExtras })
    const unsplit = roundHalfAwayFromZero(((9012 + 3333) * 6667) / 10000)
    expect(split.grossCents).toBe(unsplit)
    expect(split.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(unsplit)
  })

  it("an all-detention load drops the empty remainder line", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "percent_linehaul", basisPoints: 9000 }], deductions: [] },
      { loads: [load({ linehaulCents: 0, accessorialCents: 15000, detentionCents: 15000 })], ...noExtras }
    )
    const earnings = draft.lines.filter((l) => l.kind === "earning")
    expect(earnings).toHaveLength(1)
    expect(earnings[0].label).toBe("REF-1 — 90% of detention $150.00")
    expect(earnings[0].amountCents).toBe(13500)
  })

  it("clamps detentionCents to the billed accessorials (defensive)", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "percent_linehaul", basisPoints: 10000 }], deductions: [] },
      { loads: [load({ linehaulCents: 100000, accessorialCents: 5000, detentionCents: 99999 })], ...noExtras }
    )
    expect(draft.grossCents).toBe(105000)
    const detentionLine = draft.lines.find((l) => l.label.includes("detention"))
    expect(detentionLine?.amountCents).toBe(5000)
  })

  it("loads without detention keep their single blended line (no behavior change)", () => {
    const draft = evaluatePayRules(
      { name: "t", rules: [{ type: "percent_linehaul", basisPoints: 9000 }], deductions: [] },
      { loads: [load({ linehaulCents: 250000, accessorialCents: 15000 })], ...noExtras }
    )
    const earnings = draft.lines.filter((l) => l.kind === "earning")
    expect(earnings).toHaveLength(1)
    expect(earnings[0].label).toBe("REF-1 — 90% of $2650.00")
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

  it("drops a rule whose basisPoints exceeds 100% (TEST_GAPS.md #14)", () => {
    const parsed = parseRuleSet({
      name: "x",
      rules: [{ type: "percent_total", basisPoints: 10001 }],
      deductions: [],
    })
    expect(parsed.rules).toEqual([])
  })

  it("drops a rule with a negative rate", () => {
    const parsed = parseRuleSet({
      name: "x",
      rules: [{ type: "per_mile", rateCentsPerMile: -63 }],
      deductions: [],
    })
    expect(parsed.rules).toEqual([])
  })

  it("drops a rule whose basisPoints is a string, not a number", () => {
    const parsed = parseRuleSet({
      name: "x",
      rules: [{ type: "percent_total", basisPoints: "90" }],
      deductions: [],
    })
    expect(parsed.rules).toEqual([])
  })

  it("drops a rule with an unknown type", () => {
    const parsed = parseRuleSet({
      name: "x",
      rules: [{ type: "percent_of_the_moon", basisPoints: 9000 }],
      deductions: [],
    })
    expect(parsed.rules).toEqual([])
  })

  it("keeps valid rules alongside a dropped invalid one, and evaluatePayRules never pays the invalid rule", () => {
    const parsed = parseRuleSet({
      name: "x",
      rules: [
        { type: "percent_total", basisPoints: 9000 },
        { type: "percent_total", basisPoints: 15000 }, // corrupted: 150%, impossible as a pay rate
        { type: "flat_per_load", amountCents: -100 },
      ],
      deductions: [],
    })
    expect(parsed.rules).toEqual([{ type: "percent_total", basisPoints: 9000 }])

    const draft = evaluatePayRules(parsed, {
      loads: [load({ linehaulCents: 240000, fuelSurchargeCents: 0, accessorialCents: 0 })],
      reimbursements: [],
      outstandingAdvances: [],
    })
    // Only the 90% rule should have paid — a 150%-of-load line would add another $360.00.
    expect(draft.grossCents).toBe(216000)
    expect(draft.lines).toHaveLength(1)
  })

  it("drops a deduction with an invalid basisPoints, keeps a valid one", () => {
    const parsed = parseRuleSet({
      name: "x",
      rules: [],
      deductions: [
        { kind: "percent_of_gross", basisPoints: 20001, label: "bad" },
        { kind: "escrow", amountCents: 5000 },
      ],
    })
    expect(parsed.deductions).toEqual([{ kind: "escrow", amountCents: 5000 }])
  })
})

describe("summarizePayRules — compact subtitle summary", () => {
  it("summarizes the legacy owner-operator program with its real percentages", () => {
    const ruleSet = legacyConfigToRuleSet({
      payType: "percentage", payRate: 0.85, payLoadedMilesOnly: true,
      escrowWeeklyCents: 0, insuranceWeeklyCents: 0,
    })
    expect(summarizePayRules(ruleSet)).toBe("85% linehaul + 100% FSC")
  })

  it("summarizes the legacy per-mile program with its real rate", () => {
    const ruleSet = legacyConfigToRuleSet({
      payType: "per_mile", payRate: 0.63, payLoadedMilesOnly: true,
      escrowWeeklyCents: 0, insuranceWeeklyCents: 0,
    })
    expect(summarizePayRules(ruleSet)).toBe("$0.63/loaded mi")
  })

  it("covers custom rule shapes and omits situational bonuses", () => {
    const ruleSet: PayRuleSet = {
      name: "custom",
      rules: [
        { type: "percent_total", basisPoints: 7250 },
        { type: "flat_per_load", amountCents: 5000 },
        { type: "per_stop", amountCents: 2500 },
        { type: "referral_bonus" },
        { type: "scorecard_bonus", tiers: [{ minScore: 90, amountCents: 10000 }] },
      ],
      deductions: [],
    }
    expect(summarizePayRules(ruleSet)).toBe("72.50% all-in + $50.00/load + $25.00/extra stop")
  })

  it("returns an empty string when only bonus rules exist", () => {
    expect(summarizePayRules({ name: "b", rules: [{ type: "referral_bonus" }], deductions: [] })).toBe("")
  })
})

describe("describePayRules — plain-language pay-terms screen", () => {
  it("describes every earning rule type in driver-facing language", () => {
    const ruleSet: PayRuleSet = {
      name: "custom",
      rules: [
        { type: "per_mile", rateCentsPerMile: 63 },
        { type: "per_mile", rateCentsPerMile: 55, loadedOnly: false },
        { type: "percent_linehaul", basisPoints: 9000 },
        { type: "percent_total", basisPoints: 7250 },
        { type: "percent_accessorials", basisPoints: 5000 },
        { type: "fsc_passthrough", basisPoints: 10000 },
        { type: "fsc_passthrough", basisPoints: 5000 },
        { type: "flat_per_load", amountCents: 5000 },
        { type: "per_stop", amountCents: 2500 },
        { type: "per_stop", amountCents: 1500, afterStops: 4 },
        { type: "referral_bonus" },
        {
          type: "scorecard_bonus",
          tiers: [
            { minScore: 80, amountCents: 5000 },
            { minScore: 95, amountCents: 15000 },
          ],
        },
      ],
      deductions: [],
    }

    expect(describePayRules(ruleSet).earnings).toEqual([
      "$0.63 per loaded mile",
      "$0.55 per mile (loaded + deadhead)",
      "90% of the load rate (linehaul + accessorials)",
      "72.50% of everything the load pays (all-in)",
      "50% of accessorial charges",
      "100% of the fuel surcharge",
      "50% of the fuel surcharge",
      "$50.00 flat per load",
      "$25.00 per extra stop (after 2)",
      "$15.00 per extra stop (after 4)",
      "Referral bonuses when they come due",
      // tiers are sorted highest score first regardless of input order
      "Performance bonus: $150.00 at score 95+, $50.00 at score 80+",
    ])
  })

  it("describes every deduction kind", () => {
    const ruleSet: PayRuleSet = {
      name: "custom",
      rules: [],
      deductions: [
        { kind: "escrow", amountCents: 10000 },
        { kind: "insurance", amountCents: 7500 },
        { kind: "flat_recurring", amountCents: 2000, label: "Phone plan" },
        { kind: "percent_of_gross", basisPoints: 300, label: "Admin fee" },
      ],
    }

    expect(describePayRules(ruleSet).deductions).toEqual([
      "$100.00 escrow each settlement",
      "$75.00 insurance each settlement",
      "$20.00 Phone plan each settlement",
      "Admin fee: 3% of gross",
    ])
  })

  it("returns empty arrays for an empty rule set", () => {
    expect(describePayRules({ name: "empty", rules: [], deductions: [] })).toEqual({
      earnings: [],
      deductions: [],
    })
  })
})
