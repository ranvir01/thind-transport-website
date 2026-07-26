import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../documents", () => ({ storeGeneratedPdf: vi.fn(async () => "https://example.com/settlement.pdf") }))
vi.mock("../pdf", () => ({ buildSettlementPdf: vi.fn(async () => new Uint8Array([1])) }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { hubDb, query, queryOne } from "../db"
import { draftSettlements } from "../settlements"
import type { Driver } from "../types"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const hubDbMock = vi.mocked(hubDb)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const DRIVER = "33333333-3333-3333-3333-333333333333"
const LOAD = "44444444-4444-4444-4444-444444444444"
const EXPENSE = "55555555-5555-5555-5555-555555555555"
const ADVANCE = "66666666-6666-6666-6666-666666666666"
const ACTOR = { id: "77777777-7777-7777-7777-777777777777", name: "Test Actor" }

const driver: Driver = {
  id: DRIVER,
  user_id: null,
  first_name: "Jas",
  last_name: "Driver",
  phone: null,
  email: null,
  cdl_number: null,
  cdl_state: null,
  cdl_expiry: null,
  medical_card_expiry: null,
  hire_date: null,
  pay_type: "per_mile",
  pay_rate: "1.00",
  pay_loaded_miles_only: true,
  escrow_weekly_cents: 0,
  insurance_weekly_cents: 0,
  status: "active",
  emergency_contact_name: null,
  emergency_contact_phone: null,
  notes: null,
}

/**
 * State that mirrors the three tables draftSettlements reads/writes so a
 * missing UPDATE (the bug TEST_GAPS.md #1/#6 describes) is visible: the load
 * stays eligible and a later period re-drafts it instead of the fake DB
 * hand-computing "already paid".
 */
function makeFleetState(overrides: {
  referrals?: { id: string; bonus_cents: number; applicant_name: string; milestone: string }[]
  scorecardComposite?: number | null
  payRuleRow?: { name: string; rules: unknown[]; deductions: unknown[] } | null
} = {}) {
  return {
    loads: [{
      id: LOAD, reference: "THD-1001", linehaul_cents: 240000, fuel_surcharge_cents: 10000,
      accessorials: [] as { label?: string; amount_cents: number }[],
      loaded_miles: 500, deadhead_miles: 0, settlement_id: null as string | null,
    }],
    expenses: [{
      id: EXPENSE, memo: "fuel receipt", category: "fuel", amount_cents: 2000, settled_line_id: null as string | null,
    }],
    advances: [{ id: ADVANCE, reference: "ADV-1", amount_cents: 10000, status: "outstanding" as string }],
    settlements: [] as { id: string; driver_id: string; period_start: string; period_end: string }[],
    // undefined => "hub.referrals"/"hub.driver_scores" don't exist yet (to_regclass returns null),
    // matching payableReferralBonuses/latestScorecardScore's early-return branch (the only branch the
    // suite covered before TEST_GAPS.md #1's "table exists and has rows" branch was added below).
    referrals: overrides.referrals,
    scorecardComposite: overrides.scorecardComposite,
    payRuleRow: overrides.payRuleRow ?? null,
  }
}

function wireMocks(state: ReturnType<typeof makeFleetState>) {
  queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const s = String(sql)
    if (s.includes("FROM hub.drivers WHERE carrier_id")) return [driver]
    if (s.includes("FROM hub.loads")) {
      return state.loads
        .filter((l) => l.settlement_id === null)
        .map((l) => ({ ...l, stops_count: 0 }))
    }
    if (s.includes("FROM hub.expenses")) {
      return state.expenses.filter((e) => e.settled_line_id === null)
    }
    if (s.includes("FROM hub.advances")) {
      return state.advances.filter((a) => a.status === "outstanding")
    }
    if (s.includes("FROM hub.referrals")) return state.referrals ?? []
    return []
  })

  queryOneMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const s = String(sql)
    if (s.includes("to_regclass('hub.referrals')")) return { reg: state.referrals === undefined ? null : "hub.referrals" }
    if (s.includes("to_regclass('hub.driver_scores')")) {
      return { reg: state.scorecardComposite === undefined ? null : "hub.driver_scores" }
    }
    if (s.includes("FROM hub.driver_scores")) {
      return state.scorecardComposite == null ? null : { composite: String(state.scorecardComposite) }
    }
    if (s.includes("FROM hub.pay_rules")) return state.payRuleRow
    if (s.includes("FROM hub.settlements WHERE carrier_id") && s.includes("period_start")) {
      const [, driverId, periodStart, periodEnd] = params as [string, string, string, string]
      const found = state.settlements.find(
        (row) => row.driver_id === driverId && row.period_start === periodStart && row.period_end === periodEnd
      )
      return found ? { id: found.id } : null
    }
    return null
  })

  let nextId = 1
  const calls: { sql: string; params: unknown[] }[] = []
  hubDbMock.mockReturnValue({
    connect: vi.fn(async () => ({
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        calls.push({ sql: String(sql), params })
        const s = String(sql)
        if (/^\s*BEGIN/.test(s) || /^\s*COMMIT/.test(s) || /^\s*ROLLBACK/.test(s)) return { rows: [] }
        if (s.includes("INSERT INTO hub.settlements")) {
          const id = `settlement-${nextId++}`
          const [carrierId, driverId, periodStart, periodEnd] = params as [string, string, string, string]
          state.settlements.push({ id, driver_id: driverId, period_start: periodStart, period_end: periodEnd })
          void carrierId
          return { rows: [{ id }] }
        }
        if (s.includes("INSERT INTO hub.settlement_lines")) {
          return { rows: [{ id: `line-${nextId++}` }] }
        }
        if (s.includes("UPDATE hub.expenses SET settled_line_id")) {
          const [lineId, expenseId] = params as [string, string, string]
          const expense = state.expenses.find((e) => e.id === expenseId)
          if (expense) expense.settled_line_id = lineId
          return { rows: [] }
        }
        if (s.includes("UPDATE hub.loads SET settlement_id")) {
          const [settlementId, loadIds] = params as [string, string[], string]
          for (const id of loadIds) {
            const load = state.loads.find((l) => l.id === id)
            if (load) load.settlement_id = settlementId
          }
          return { rows: [] }
        }
        return { rows: [] }
      }),
      release: vi.fn(),
    })),
  } as unknown as ReturnType<typeof hubDb>)

  return calls
}

describe("draftSettlements — settlement_id stamp on loads (TEST_GAPS.md #1/#6)", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
    hubDbMock.mockReset()
  })

  it("stamps every paid load with settlement_id and marks reimbursed expenses, matching the evaluator's totals", async () => {
    const state = makeFleetState()
    const calls = wireMocks(state)

    const result = await draftSettlements(CARRIER, "2026-06-01", "2026-06-07", ACTOR)

    expect(result).toEqual({ created: 1, skipped: 0 })

    const insertSettlement = calls.find((c) => c.sql.includes("INSERT INTO hub.settlements"))
    expect(insertSettlement).toBeDefined()
    // 500 loaded mi × $1.00/mi = $500 earning + $20 expense reimbursement, minus a $100 advance.
    expect(insertSettlement!.params).toEqual([CARRIER, DRIVER, "2026-06-01", "2026-06-07", 52000, 10000, 42000])

    const settlementId = state.settlements[0].id
    const updateLoads = calls.find((c) => c.sql.includes("UPDATE hub.loads SET settlement_id"))
    expect(updateLoads).toBeDefined()
    expect(updateLoads!.params).toEqual([settlementId, [LOAD], CARRIER])
    expect(state.loads[0].settlement_id).toBe(settlementId)

    const updateExpense = calls.find((c) => c.sql.includes("UPDATE hub.expenses SET settled_line_id"))
    expect(updateExpense).toBeDefined()
    expect(updateExpense!.params[1]).toBe(EXPENSE)
    expect(updateExpense!.params[2]).toBe(CARRIER)
    expect(state.expenses[0].settled_line_id).not.toBeNull()
  })

  it("a load already stamped into last period's settlement is never re-drafted into the next period", async () => {
    const state = makeFleetState()
    wireMocks(state)

    const first = await draftSettlements(CARRIER, "2026-06-01", "2026-06-07", ACTOR)
    expect(first).toEqual({ created: 1, skipped: 0 })
    expect(state.loads[0].settlement_id).not.toBeNull()

    // Next week: same driver, same (now-stamped) load, no new work.
    const second = await draftSettlements(CARRIER, "2026-06-08", "2026-06-14", ACTOR)
    expect(second).toEqual({ created: 0, skipped: 1 })
    expect(state.settlements).toHaveLength(1)
  })
})

describe("draftSettlements — payableReferralBonuses + latestScorecardScore (TEST_GAPS.md #1 remaining gap)", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
    hubDbMock.mockReset()
  })

  it("adds a payable referral bonus as its own settlement line once hub.referrals exists", async () => {
    const state = makeFleetState({
      referrals: [{ id: "referral-1", bonus_cents: 5000, applicant_name: "Sarah Wilson", milestone: "first_load_completed" }],
    })
    const calls = wireMocks(state)

    const result = await draftSettlements(CARRIER, "2026-06-01", "2026-06-07", ACTOR)
    expect(result).toEqual({ created: 1, skipped: 0 })

    // 500 loaded mi × $1.00/mi = $500 + $20 expense reimbursement + $50 referral bonus, minus a $100 advance.
    const insertSettlement = calls.find((c) => c.sql.includes("INSERT INTO hub.settlements"))
    expect(insertSettlement!.params).toEqual([CARRIER, DRIVER, "2026-06-01", "2026-06-07", 57000, 10000, 47000])

    const referralLine = calls.find(
      (c) => c.sql.includes("INSERT INTO hub.settlement_lines") && c.params[4] === "referral"
    )
    expect(referralLine).toBeDefined()
    expect(referralLine!.params).toEqual(
      expect.arrayContaining(["earning", "Referral bonus — Sarah Wilson (first load completed)", 5000, "referral", "referral-1"])
    )
  })

  it("does not add a referral bonus when hub.referrals has no payable row for this driver", async () => {
    const state = makeFleetState({ referrals: [] })
    const calls = wireMocks(state)

    const result = await draftSettlements(CARRIER, "2026-06-01", "2026-06-07", ACTOR)
    expect(result).toEqual({ created: 1, skipped: 0 })

    const insertSettlement = calls.find((c) => c.sql.includes("INSERT INTO hub.settlements"))
    // Same totals as the baseline test with no referral rows at all: table exists, just nothing payable.
    expect(insertSettlement!.params).toEqual([CARRIER, DRIVER, "2026-06-01", "2026-06-07", 52000, 10000, 42000])
  })

  it("adds a scorecard bonus at the matching tier once hub.driver_scores has a composite for this driver", async () => {
    const state = makeFleetState({
      scorecardComposite: 92,
      payRuleRow: {
        name: "Custom",
        rules: [
          { type: "per_mile", rateCentsPerMile: 100, loadedOnly: true },
          { type: "scorecard_bonus", tiers: [{ minScore: 80, amountCents: 10000 }, { minScore: 90, amountCents: 20000 }] },
        ],
        deductions: [],
      },
    })
    const calls = wireMocks(state)

    const result = await draftSettlements(CARRIER, "2026-06-01", "2026-06-07", ACTOR)
    expect(result).toEqual({ created: 1, skipped: 0 })

    // $500 per-mile + $200 scorecard bonus (92 clears the 90-point tier, not the 80-point one) +
    // $20 expense reimbursement, minus the $100 advance (no escrow/insurance on this custom rule set).
    const insertSettlement = calls.find((c) => c.sql.includes("INSERT INTO hub.settlements"))
    expect(insertSettlement!.params).toEqual([CARRIER, DRIVER, "2026-06-01", "2026-06-07", 72000, 10000, 62000])

    const scorecardLine = calls.find(
      (c) => c.sql.includes("INSERT INTO hub.settlement_lines") && c.params[4] === "scorecard"
    )
    expect(scorecardLine).toBeDefined()
    expect(scorecardLine!.params).toEqual(
      expect.arrayContaining(["earning", "Safety & performance bonus (score 92)", 20000, "scorecard"])
    )
  })
})
