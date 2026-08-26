/**
 * approveSettlement's advance-apply loop (settlements.ts:267-272) is the only
 * thing stopping an advance deducted on a statement from being deducted again
 * on the next settlement: `AND status = 'outstanding'` in the WHERE clause.
 * Nothing pinned the exact statement or its params before this (TEST_GAPS.md
 * §2 item 6) — a change that dropped the status guard, swapped a param, or
 * broke the per-line loop would pass every existing test while silently
 * letting a driver's advance get applied twice.
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
  mailShouldSend: vi.fn(async () => false),
  mailFrom: vi.fn(() => "payroll@example.com"),
}))

import { query, queryOne } from "../db"
import { approveSettlement } from "../settlements"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const SETTLEMENT = "22222222-2222-2222-2222-222222222222"
const DRIVER = "33333333-3333-3333-3333-333333333333"
const ACTOR = { id: "44444444-4444-4444-4444-444444444444", name: "Test Actor" }

const draftSettlement = {
  id: SETTLEMENT,
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

type Line = {
  id: string
  kind: string
  label: string
  amount_cents: number
  source_type: string | null
  source_id: string | null
}

/** Dispatching mocks: settlement read, driver read, lines read, claim UPDATE. */
function mockApproveQueries(lines: Line[], advancesRowsAffected: (advanceId: string) => number = () => 1) {
  queryOneMock.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("hub.settlements s JOIN hub.drivers")) return draftSettlement
    if (s.includes("FROM hub.drivers WHERE id = $1 AND carrier_id = $2")) return { id: DRIVER, email: null }
    return null
  })
  queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const s = String(sql)
    if (s.includes("FROM hub.settlement_lines")) return lines
    if (s.includes("SET status = 'approved'")) return [{ id: SETTLEMENT }]
    if (s.includes("UPDATE hub.advances")) {
      const advanceId = (params as string[])[1]
      return Array.from({ length: advancesRowsAffected(advanceId) }, () => ({ id: advanceId }))
    }
    return []
  })
}

function advanceLine(id: string, sourceId: string | null): Line {
  return { id, kind: "deduction", label: "Advance", amount_cents: 5000, source_type: "advance", source_id: sourceId }
}

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
})

describe("approveSettlement applies outstanding advances", () => {
  it("stamps the exact advance with the settlement id, guarded by status = 'outstanding'", async () => {
    mockApproveQueries([advanceLine("l1", "adv-1")])

    await approveSettlement(CARRIER, SETTLEMENT, ACTOR)

    const advanceUpdate = queryMock.mock.calls.find(([sql]) => String(sql).includes("UPDATE hub.advances"))
    expect(advanceUpdate).toBeDefined()
    const [sql, params] = advanceUpdate!
    expect(String(sql)).toContain("SET status = 'applied', applied_settlement_id = $1")
    expect(String(sql)).toContain("WHERE id = $2 AND carrier_id = $3 AND status = 'outstanding'")
    expect(params).toEqual([SETTLEMENT, "adv-1", CARRIER])
  })

  it("applies every advance line independently and skips non-advance / sourceless lines", async () => {
    mockApproveQueries([
      advanceLine("l1", "adv-1"),
      advanceLine("l2", "adv-2"),
      { id: "l3", kind: "deduction", label: "Referral", amount_cents: 5000, source_type: "referral", source_id: "ref-1" },
      advanceLine("l4", null), // advance-typed but no source_id — must not fire an UPDATE with a null id
    ])

    await approveSettlement(CARRIER, SETTLEMENT, ACTOR)

    const advanceUpdates = queryMock.mock.calls.filter(([sql]) => String(sql).includes("UPDATE hub.advances"))
    expect(advanceUpdates).toHaveLength(2)
    expect(advanceUpdates.map(([, params]) => (params as string[])[1])).toEqual(["adv-1", "adv-2"])
  })

  it("the status = 'outstanding' guard makes re-applying an already-applied advance a no-op, not a crash", async () => {
    // Simulates the race the guard exists for: a concurrent or retried approval
    // targets an advance a prior run already flipped to 'applied'. The UPDATE's
    // WHERE clause matches zero rows — the code does not branch on the result,
    // so this only stays safe as long as the guard clause is present (asserted
    // in the first test above).
    mockApproveQueries([advanceLine("l1", "adv-already-applied")], () => 0)

    await expect(approveSettlement(CARRIER, SETTLEMENT, ACTOR)).resolves.toMatchObject({ emailed: false })

    const advanceUpdates = queryMock.mock.calls.filter(([sql]) => String(sql).includes("UPDATE hub.advances"))
    expect(advanceUpdates).toHaveLength(1)
  })
})
