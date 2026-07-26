/**
 * TEST_GAPS.md §2 item #6: the advance-apply UPDATE loop inside
 * approveSettlement (settlements.ts:267-272) was 0% covered. The
 * `AND status = 'outstanding'` guard there is the only thing stopping an
 * advance from being deducted twice — draftSettlements pulls advances into a
 * new settlement with `WHERE ... status = 'outstanding'` (settlements.ts:137),
 * so an advance that is never flipped to 'applied' (or whose guard is
 * removed) resurfaces in the next period and pays out again.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ name: "Demo" })),
  getCarrierSettings: vi.fn(async () => ({ branding: { accent: null } })),
}))
vi.mock("../documents", () => ({ storeGeneratedPdf: vi.fn(async () => "https://example.com/settlement.pdf") }))
vi.mock("../pdf", () => ({ buildSettlementPdf: vi.fn(async () => new Uint8Array([1])) }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(),
  isEmailConfigured: vi.fn(() => false),
  mailFrom: vi.fn(() => "payroll@example.com"),
}))

import { hubDb, query, queryOne } from "../db"
import { approveSettlement } from "../settlements"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const hubDbMock = vi.mocked(hubDb)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const DRIVER = "33333333-3333-3333-3333-333333333333"
const ADVANCE = "66666666-6666-6666-6666-666666666666"
const ACTOR = { id: "77777777-7777-7777-7777-777777777777", name: "Test Actor" }

function draftSettlement(id: string) {
  return {
    id,
    carrier_id: CARRIER,
    driver_id: DRIVER,
    driver_name: "Test Driver",
    pay_type: "percentage" as const,
    status: "draft" as const,
    period_start: "2026-06-01",
    period_end: "2026-06-07",
    gross_cents: 100000,
    deductions_cents: 10000,
    net_cents: 90000,
    statement_url: null,
  }
}

const advanceLine = {
  id: "line-1", kind: "deduction", label: "Advance", amount_cents: 10000,
  source_type: "advance", source_id: ADVANCE,
}

/**
 * Stateful fake `hub.advances` row so the guard is exercised functionally,
 * not just pattern-matched: the UPDATE only flips status when both the SQL
 * carries the literal `status = 'outstanding'` clause AND the row is
 * currently outstanding — the same double condition a real Postgres UPDATE
 * enforces.
 */
function wireAdvanceState(initialStatus: string) {
  const state = { status: initialStatus }
  const settlements = new Map<string, ReturnType<typeof draftSettlement>>()
  const calls: { sql: string; params: unknown[] }[] = []

  queryOneMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const s = String(sql)
    if (s.includes("hub.settlements s JOIN hub.drivers")) {
      const [, settlementId] = params as [string, string]
      return settlements.get(settlementId) ?? null
    }
    if (s.includes("FROM hub.drivers WHERE id = $1 AND carrier_id = $2")) return { id: DRIVER, email: null }
    return null
  })

  queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const s = String(sql)
    calls.push({ sql: s, params })
    if (s.includes("FROM hub.settlement_lines")) return [advanceLine]
    if (s.includes("SET status = 'approved'")) return [{ id: (params as string[])[1] }]
    if (s.includes("UPDATE hub.advances")) {
      const guarded = s.includes("status = 'outstanding'")
      if (!guarded || state.status === "outstanding") state.status = "applied"
      return []
    }
    if (s.includes("FROM hub.advances") && s.includes("status = 'outstanding'")) {
      return state.status === "outstanding" ? [{ id: ADVANCE, reference: "ADV-1", amount_cents: 10000 }] : []
    }
    return []
  })

  hubDbMock.mockReturnValue({
    connect: vi.fn(async () => ({
      query: vi.fn(async (sql: string) => {
        if (/^\s*(BEGIN|COMMIT|ROLLBACK)/.test(String(sql))) return { rows: [] }
        return { rows: [] }
      }),
      release: vi.fn(),
    })),
  } as unknown as ReturnType<typeof hubDb>)

  return { state, settlements, calls }
}

describe("approveSettlement applies outstanding advances exactly once (TEST_GAPS.md #6)", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
    hubDbMock.mockReset()
  })

  it("fires UPDATE hub.advances with applied_settlement_id, the outstanding guard, and carrier-scoped params", async () => {
    const { settlements, calls } = wireAdvanceState("outstanding")
    settlements.set("settlement-1", draftSettlement("settlement-1"))

    await approveSettlement(CARRIER, "settlement-1", ACTOR)

    const advanceUpdate = calls.find((c) => c.sql.includes("UPDATE hub.advances"))
    expect(advanceUpdate).toBeDefined()
    expect(advanceUpdate!.sql).toContain("SET status = 'applied'")
    expect(advanceUpdate!.sql).toContain("applied_settlement_id = $1")
    expect(advanceUpdate!.sql).toContain("WHERE id = $2 AND carrier_id = $3 AND status = 'outstanding'")
    expect(advanceUpdate!.params).toEqual(["settlement-1", ADVANCE, CARRIER])
  })

  it("an advance applied by one settlement is excluded from the next period's outstanding-advances query", async () => {
    const { state, settlements } = wireAdvanceState("outstanding")
    settlements.set("settlement-1", draftSettlement("settlement-1"))

    await approveSettlement(CARRIER, "settlement-1", ACTOR)
    expect(state.status).toBe("applied")

    // Same query shape draftSettlements issues when drafting the next period.
    const outstanding = await query<{ id: string }>(
      `SELECT id, reference, amount_cents FROM hub.advances
       WHERE carrier_id = $1 AND driver_id = $2 AND status = 'outstanding'`,
      [CARRIER, DRIVER]
    )
    expect(outstanding).toEqual([])
  })

  it("re-applying an already-applied advance (e.g. the same advance lands on a second settlement) is a no-op, not a second deduction", async () => {
    const { state, settlements, calls } = wireAdvanceState("applied")
    settlements.set("settlement-2", draftSettlement("settlement-2"))

    await approveSettlement(CARRIER, "settlement-2", ACTOR)

    expect(state.status).toBe("applied")
    const advanceUpdate = calls.find((c) => c.sql.includes("UPDATE hub.advances"))
    expect(advanceUpdate).toBeDefined()
    expect(advanceUpdate!.sql).toContain("status = 'outstanding'")
  })
})
