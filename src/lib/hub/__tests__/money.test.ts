import { describe, expect, it } from "vitest"
import {
  agingBucket, computeSettlement, detentionCents, factoringNetCents, fscCentsPerMile, fscTotalCents,
  invoiceTotalCents, roundHalfAwayFromZero,
} from "../money"

describe("rounding", () => {
  it("rounds half away from zero", () => {
    expect(roundHalfAwayFromZero(11110.5)).toBe(11111)
    expect(roundHalfAwayFromZero(-11110.5)).toBe(-11111)
    expect(roundHalfAwayFromZero(785.714)).toBe(786)
    expect(roundHalfAwayFromZero(-785.714)).toBe(-786)
  })
})

describe("invoice totals", () => {
  it("sums linehaul + FSC + accessorials exactly", () => {
    // $3,200.00 + $350.00 + detention $150.00 + lumper $89.50 = $3,789.50
    expect(
      invoiceTotalCents({
        linehaulCents: 320000,
        fuelSurchargeCents: 35000,
        accessorials: [
          { label: "Detention", amount_cents: 15000 },
          { label: "Lumper", amount_cents: 8950 },
        ],
      })
    ).toBe(378950)
  })
})

describe("factoring expected net", () => {
  it("computes fee and reserve to integer cents from bps", () => {
    const net = factoringNetCents({ grossCents: 378950, feeBps: 300, reserveBps: 1000 })
    expect(net).toEqual({
      grossCents: 378950,
      feeCents: 11369,
      reserveCents: 37895,
      expectedNetCents: 329686,
    })
  })

  it("rounds half away from zero for odd-cent fees", () => {
    expect(factoringNetCents({ grossCents: 12345, feeBps: 250 }).feeCents).toBe(309)
  })
})

describe("AR aging buckets", () => {
  const due = new Date(Date.UTC(2026, 5, 1)) // Jun 1
  const cases: [string, Date, string][] = [
    ["on due date = current", new Date(Date.UTC(2026, 5, 1)), "current"],
    ["1 day past", new Date(Date.UTC(2026, 5, 2)), "1-30"],
    ["30 days past (boundary)", new Date(Date.UTC(2026, 6, 1)), "1-30"],
    ["31 days past (boundary)", new Date(Date.UTC(2026, 6, 2)), "31-60"],
    ["90 days past (boundary)", new Date(Date.UTC(2026, 7, 30)), "61-90"],
    ["91 days past", new Date(Date.UTC(2026, 7, 31)), "90+"],
  ]
  for (const [name, asOf, expected] of cases) {
    it(name, () => expect(agingBucket(due, asOf)).toBe(expected))
  }
})

describe("fuel surcharge function", () => {
  it("DOE index $3.90, base $1.20, 6 MPG → 45.0 ¢/mi", () => {
    expect(fscCentsPerMile(390, 120, 6)).toBe(45)
  })
  it("DOE index $3.85 → 44.1667 ¢/mi (4-decimal rate)", () => {
    expect(fscCentsPerMile(385, 120, 6)).toBe(44.1667)
  })
  it("index below base floors at zero", () => {
    expect(fscCentsPerMile(100, 120, 6)).toBe(0)
  })
  it("per-load FSC: 500 mi × 44.1667 ¢/mi = $220.83", () => {
    expect(fscTotalCents(500, 44.1667)).toBe(22083)
  })
})

describe("settlement engine — company driver week (hand-computed)", () => {
  // $0.63/mi loaded-only. 520 mi → $327.60; 480 mi → $302.40.
  // + lumper reimbursement $150.00
  // − advance $200.00 − escrow $50.00 − insurance $75.00
  // gross $780.00, deductions $325.00, net $455.00
  const draft = computeSettlement(
    [
      { id: "a", reference: "THD-1001", linehaulCents: 210000, fuelSurchargeCents: 20000, accessorialCents: 0, loadedMiles: 520, deadheadMiles: 40 },
      { id: "b", reference: "THD-1002", linehaulCents: 195000, fuelSurchargeCents: 18000, accessorialCents: 0, loadedMiles: 480, deadheadMiles: 25 },
    ],
    { payType: "per_mile", payRate: 0.63, payLoadedMilesOnly: true, escrowWeeklyCents: 5000, insuranceWeeklyCents: 7500 },
    [{ label: "Lumper receipt", amountCents: 15000, sourceId: "exp1" }],
    [{ id: "adv1", reference: "EFS code 4417", amountCents: 20000 }]
  )

  it("earnings to the penny", () => {
    const earnings = draft.lines.filter((l) => l.kind === "earning")
    expect(earnings.map((l) => l.amountCents)).toEqual([32760, 30240])
  })
  it("gross = earnings + reimbursements", () => expect(draft.grossCents).toBe(78000))
  it("deductions = advance + escrow + insurance", () => expect(draft.deductionsCents).toBe(32500))
  it("net pay", () => expect(draft.netCents).toBe(45500))
  it("pays all miles when configured", () => {
    const allMiles = computeSettlement(
      [{ id: "a", reference: "L", linehaulCents: 0, fuelSurchargeCents: 0, accessorialCents: 0, loadedMiles: 520, deadheadMiles: 40 }],
      { payType: "per_mile", payRate: 0.63, payLoadedMilesOnly: false, escrowWeeklyCents: 0, insuranceWeeklyCents: 0 },
      [], []
    )
    expect(allMiles.grossCents).toBe(35280) // 560 mi × $0.63
  })
})

describe("settlement engine — owner-operator week (hand-computed)", () => {
  // 90% of (linehaul + accessorials) + 100% FSC.
  // Load 1: 90% × $2,650.00 = $2,385.00 + FSC $300.00 = $2,685.00
  // Load 2: 90% × $1,800.00 = $1,620.00 + FSC $200.00 = $1,820.00
  // − escrow $100.00 → net $4,405.00
  const draft = computeSettlement(
    [
      { id: "1", reference: "THD-1010", linehaulCents: 250000, fuelSurchargeCents: 30000, accessorialCents: 15000, loadedMiles: 800, deadheadMiles: 60 },
      { id: "2", reference: "THD-1011", linehaulCents: 180000, fuelSurchargeCents: 20000, accessorialCents: 0, loadedMiles: 600, deadheadMiles: 40 },
    ],
    { payType: "percentage", payRate: 0.9, payLoadedMilesOnly: true, escrowWeeklyCents: 10000, insuranceWeeklyCents: 0 },
    [], []
  )

  it("earnings per load (commission and FSC itemized for statement transparency)", () => {
    const earnings = draft.lines.filter((l) => l.kind === "earning")
    // Load 1: 90% × $2,650.00 = $2,385.00, then FSC $300.00
    // Load 2: 90% × $1,800.00 = $1,620.00, then FSC $200.00
    expect(earnings.map((l) => l.amountCents)).toEqual([238500, 30000, 162000, 20000])
    // Per-load totals match the hand computation exactly.
    const perLoad = new Map<string, number>()
    for (const line of earnings) perLoad.set(line.sourceId!, (perLoad.get(line.sourceId!) ?? 0) + line.amountCents)
    expect(perLoad.get("1")).toBe(268500)
    expect(perLoad.get("2")).toBe(182000)
  })
  it("gross / deductions / net", () => {
    expect(draft.grossCents).toBe(450500)
    expect(draft.deductionsCents).toBe(10000)
    expect(draft.netCents).toBe(440500)
  })
  it("rounds commission half away from zero", () => {
    const tiny = computeSettlement(
      [{ id: "t", reference: "T", linehaulCents: 12345, fuelSurchargeCents: 0, accessorialCents: 0, loadedMiles: 1, deadheadMiles: 0 }],
      { payType: "percentage", payRate: 0.9, payLoadedMilesOnly: true, escrowWeeklyCents: 0, insuranceWeeklyCents: 0 },
      [], []
    )
    expect(tiny.grossCents).toBe(11111) // 0.9 × 12345 = 11110.5 → 11111
  })
})

describe("detention", () => {
  it("4.5h dwell, 2 free hours, $60/hr → $150.00", () => {
    expect(
      detentionCents(
        new Date("2026-06-10T08:00:00Z"), new Date("2026-06-10T12:30:00Z"), 2, 6000
      )
    ).toBe(15000)
  })
  it("inside free time owes nothing", () => {
    expect(
      detentionCents(
        new Date("2026-06-10T08:00:00Z"), new Date("2026-06-10T09:30:00Z"), 2, 6000
      )
    ).toBe(0)
  })
})
