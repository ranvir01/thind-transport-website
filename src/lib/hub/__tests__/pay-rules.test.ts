import { describe, expect, it } from "vitest"
import { computeSettlement } from "../money"
import { roundHalfAwayFromZero } from "../rounding"
import {
  evaluatePayRules, legacyConfigToRuleSet, parseRuleSet, summarizePayRules,
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

  it("drops a rule with an unknown type instead of passing it through", () => {
    const parsed = parseRuleSet({
      name: "x",
      rules: [{ type: "flux_capacitor", basisPoints: 9000 }, { type: "referral_bonus" }],
      deductions: [],
    })
    expect(parsed.rules).toEqual([{ type: "referral_bonus" }])
  })

  it("throws on a negative basisPoints", () => {
    expect(() =>
      parseRuleSet({ name: "x", rules: [{ type: "percent_linehaul", basisPoints: -1 }], deductions: [] })
    ).toThrow(/basisPoints/)
  })

  it("throws on basisPoints above 10000 (over 100%)", () => {
    expect(() =>
      parseRuleSet({ name: "x", rules: [{ type: "percent_total", basisPoints: 10001 }], deductions: [] })
    ).toThrow(/basisPoints/)
  })

  it("throws on a negative per_mile rate", () => {
    expect(() =>
      parseRuleSet({ name: "x", rules: [{ type: "per_mile", rateCentsPerMile: -63 }], deductions: [] })
    ).toThrow(/rateCentsPerMile/)
  })

  it("throws when basisPoints is a string instead of a number", () => {
    expect(() =>
      parseRuleSet({ name: "x", rules: [{ type: "fsc_passthrough", basisPoints: "10000" }], deductions: [] })
    ).toThrow(/basisPoints/)
  })

  it("passes through valid rules of every known type unchanged", () => {
    const parsed = parseRuleSet({
      name: "x",
      rules: [
        { type: "per_mile", rateCentsPerMile: 63 },
        { type: "percent_linehaul", basisPoints: 9000 },
        { type: "flat_per_load", amountCents: 5000 },
        { type: "per_stop", amountCents: 2500 },
        { type: "scorecard_bonus", tiers: [{ minScore: 90, amountCents: 10000 }] },
      ],
      deductions: [],
    })
    expect(parsed.rules).toHaveLength(5)
  })

  it("drops a deduction with an invalid basisPoints, keeps a valid one", () => {
    // Deductions fail SAFE (dropped) rather than throwing like rules do: a
    // skipped deduction can only pay the driver more, while a skipped rule
    // would silently underpay — hence the asymmetry in parseRuleSet.
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

  it("drops a deduction of an unknown kind", () => {
    const parsed = parseRuleSet({
      name: "x",
      rules: [],
      deductions: [{ kind: "not_a_real_kind", amountCents: 100 }, { kind: "insurance", amountCents: 2500 }],
    })
    expect(parsed.deductions).toEqual([{ kind: "insurance", amountCents: 2500 }])
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

/**
 * Golden settlement (2026-08 build addendum acceptance): a mixed program —
 * per-mile base + percentage on accessorials + hourly yard time — with a
 * fuel-card deduction and a weekly escrow reserve, reconciling to the cent.
 * Every figure below is hand-computed from the rule definitions; if the
 * evaluator drifts by a penny anywhere, the net stops matching.
 */
describe("golden settlement — mixed rules, fuel deduction, escrow", () => {
  const ruleSet: PayRuleSet = {
    name: "Company driver + yard time",
    rules: [
      { type: "per_mile", rateCentsPerMile: 63 },              // loaded only
      { type: "percent_accessorials", basisPoints: 5000 },     // 50% of accessorials
      { type: "hourly", rateCentsPerHour: 2200 },              // $22/hr yard time
    ],
    deductions: [
      { kind: "flat_recurring", amountCents: 4850, label: "Fuel card — personal use" },
      { kind: "escrow", amountCents: 5000 },
    ],
  }

  const loads: PayLoadContext[] = [
    // 512 loaded mi × 63¢ = 32256; accessorials 7500 → 50% = 3750
    { id: "a", reference: "THD-2001", linehaulCents: 180000, fuelSurchargeCents: 21000, accessorialCents: 7500, loadedMiles: 512, deadheadMiles: 40 },
    // 487 loaded mi × 63¢ = 30681; odd accessorial forces rounding: 6255 → 3127.5 → 3128
    { id: "b", reference: "THD-2002", linehaulCents: 165000, fuelSurchargeCents: 19000, accessorialCents: 6255, loadedMiles: 487, deadheadMiles: 65 },
  ]

  it("reconciles gross, deductions, and net to the cent", () => {
    const draft = evaluatePayRules(ruleSet, {
      loads,
      reimbursements: [{ label: "Scale ticket", amountCents: 1350 }],
      outstandingAdvances: [{ id: "adv1", reference: "ADV-9", amountCents: 20000 }],
      hoursWorkedMinutes: 150, // 2h30m × $22 = $55.00
    })

    // Earnings: 32256 + 3750 + 30681 + 3128 + 5500 = 75315
    const earnings = draft.lines.filter((l) => l.kind === "earning").reduce((s, l) => s + l.amountCents, 0)
    expect(earnings).toBe(75315)

    // Gross = earnings + reimbursement
    expect(draft.grossCents).toBe(75315 + 1350)

    // Deductions: advance 20000 + fuel card 4850 + escrow 5000
    expect(draft.deductionsCents).toBe(29850)

    // Net, to the cent
    expect(draft.netCents).toBe(76665 - 29850)
    expect(draft.netCents).toBe(46815)

    // The statement itemizes the fuel-card and escrow lines by name
    const labels = draft.lines.map((l) => l.label)
    expect(labels).toContain("Fuel card — personal use")
    expect(labels).toContain("Escrow contribution")
    expect(labels.some((l) => l.includes("2h 30m"))).toBe(true)
  })

  it("hourly pays nothing on a period with no logged minutes", () => {
    const draft = evaluatePayRules(ruleSet, { loads: [], reimbursements: [], outstandingAdvances: [] })
    expect(draft.lines.filter((l) => l.sourceType === "hours")).toHaveLength(0)
    // And with no earnings at all, recurring deductions stay off the statement.
    expect(draft.lines.filter((l) => l.kind === "deduction")).toHaveLength(0)
  })

  it("summary names the hourly rate", () => {
    expect(summarizePayRules(ruleSet)).toBe("$0.63/loaded mi + 50% accessorials + $22.00/hr")
  })
})
