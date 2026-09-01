import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
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
const SETTLEMENT_1 = "settlement-aaaa"
const SETTLEMENT_2 = "settlement-bbbb"
const ACTOR = { id: "77777777-7777-7777-7777-777777777777", name: "Test Actor" }

/**
 * Two draft settlements both carry a settlement_line pointing at the SAME
 * advance (the real-world trigger: an advance line copied into a later
 * period's draft before the first settlement was approved). TEST_GAPS.md
 * §2 item 6: only the `AND status = 'outstanding'` guard in the UPDATE at
 * settlements.ts:269 stops the second approval from re-applying it.
 */
function makeFleetState() {
  return {
    advances: [{ id: ADVANCE, status: "outstanding" as string, applied_settlement_id: null as string | null }],
    settlements: [
      { id: SETTLEMENT_1, driver_id: DRIVER, status: "draft" as string },
      { id: SETTLEMENT_2, driver_id: DRIVER, status: "draft" as string },
    ],
  }
}

function wireMocks(state: ReturnType<typeof makeFleetState>) {
  const calls: { sql: string; params: unknown[] }[] = []

  queryOneMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const s = String(sql)
    if (s.includes("FROM hub.settlements s JOIN hub.drivers d") && s.includes("s.id = $2")) {
      const [, settlementId] = params as [string, string]
      const found = state.settlements.find((row) => row.id === settlementId)
      return found
        ? { id: found.id, carrier_id: CARRIER, driver_id: found.driver_id, status: found.status,
            gross_cents: 0, deductions_cents: 0, net_cents: 0, statement_url: null, approved_at: null,
            period_start: "2026-06-01", period_end: "2026-06-07", driver_name: "Jas Driver" }
        : null
    }
    if (s.includes("FROM hub.drivers WHERE id = $1 AND carrier_id = $2")) {
      return { id: DRIVER, first_name: "Jas", last_name: "Driver", email: null }
    }
    if (s.includes("FROM hub.carriers WHERE id")) return null
    if (s.includes("FROM hub.carrier_settings WHERE carrier_id")) return null
    return null
  })

  queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql: String(sql), params })
    const s = String(sql)
    if (s.includes("FROM hub.settlement_lines sl")) {
      const [, settlementId] = params as [string, string]
      return [{
        id: `line-${settlementId}`, settlement_id: settlementId, kind: "deduction" as const,
        label: "Advance repayment", amount_cents: 10000, source_type: "advance", source_id: ADVANCE,
      }]
    }
    if (s.includes("UPDATE hub.settlements SET status = 'approved'")) {
      const [carrierId, settlementId] = params as [string, string]
      const found = state.settlements.find((row) => row.id === settlementId)
      if (!found || found.status !== "draft") return []
      void carrierId
      found.status = "approved"
      return [{ id: found.id }]
    }
    if (s.includes("UPDATE hub.advances SET status = 'applied'")) {
      const [settlementId, sourceId] = params as [string, string, string]
      const advance = state.advances.find((a) => a.id === sourceId && a.status === "outstanding")
      if (!advance) return []
      advance.status = "applied"
      advance.applied_settlement_id = settlementId
      return [{ id: advance.id }]
    }
    if (s.includes("UPDATE hub.settlements SET statement_url")) return []
    return []
  })

  hubDbMock.mockReturnValue({ connect: vi.fn() } as unknown as ReturnType<typeof hubDb>)

  return calls
}

describe("approveSettlement — advance double-apply guard (TEST_GAPS.md §2 item 6)", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
    hubDbMock.mockReset()
  })

  it("flips an outstanding advance to applied on approval, guarded by an 'outstanding' WHERE clause", async () => {
    const state = makeFleetState()
    const calls = wireMocks(state)

    await approveSettlement(CARRIER, SETTLEMENT_1, ACTOR)

    expect(state.advances[0].status).toBe("applied")
    expect(state.advances[0].applied_settlement_id).toBe(SETTLEMENT_1)

    // Pin the literal idempotency guard in the SQL text (settlements.ts:269) —
    // a copy-paste that dropped it would still pass a state-level mock check.
    const advanceUpdate = calls.find((c) => c.sql.includes("UPDATE hub.advances SET status = 'applied'"))
    expect(advanceUpdate).toBeDefined()
    expect(advanceUpdate!.sql).toContain("AND status = 'outstanding'")
    expect(advanceUpdate!.params).toEqual([SETTLEMENT_1, ADVANCE, CARRIER])
  })

  it("never re-applies the same advance through a second settlement (double-deduct guard)", async () => {
    const state = makeFleetState()
    wireMocks(state)

    await approveSettlement(CARRIER, SETTLEMENT_1, ACTOR)
    expect(state.advances[0].applied_settlement_id).toBe(SETTLEMENT_1)

    // Second draft settlement carries a stale line pointing at the same advance.
    await approveSettlement(CARRIER, SETTLEMENT_2, ACTOR)

    // The advance stays claimed by the settlement that first applied it — the
    // `AND status = 'outstanding'` guard makes the second UPDATE a no-op.
    expect(state.advances[0].status).toBe("applied")
    expect(state.advances[0].applied_settlement_id).toBe(SETTLEMENT_1)
  })
})
