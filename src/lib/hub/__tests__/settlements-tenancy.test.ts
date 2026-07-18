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

import { query, queryOne } from "../db"
import { approveSettlement, getSettlementLines } from "../settlements"

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

/** Dispatching mocks: settlement read, driver read, lines read, claim UPDATE. */
function mockApproveQueries(opts: { claimWins: boolean; escrowLine?: boolean }) {
  queryOneMock.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("hub.settlements s JOIN hub.drivers")) return draftSettlement
    if (s.includes("FROM hub.drivers WHERE id = $1 AND carrier_id = $2")) return { id: DRIVER, email: null }
    return null
  })
  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("FROM hub.settlement_lines")) {
      return opts.escrowLine
        ? [{ id: "l1", kind: "deduction", label: "Escrow", amount_cents: -5000, source_type: "escrow", source_id: null }]
        : []
    }
    if (s.includes("SET status = 'approved'")) return opts.claimWins ? [{ id: SETTLEMENT }] : []
    return []
  })
}

describe("approveSettlement carrier-guards driver read", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
    mockApproveQueries({ claimWins: true })
  })

  it("loads the driver with carrier_id = $2 (not id-only)", async () => {
    await approveSettlement(CARRIER, SETTLEMENT, ACTOR)
    const driverLookup = queryOneMock.mock.calls.find(([sql]) =>
      String(sql).includes("FROM hub.drivers WHERE id = $1 AND carrier_id = $2")
    )
    expect(driverLookup).toBeDefined()
    expect(driverLookup![1]).toEqual([DRIVER, CARRIER])
  })
})

describe("approveSettlement claims the draft atomically before side effects", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("flips draft -> approved with carrier + status gate in one statement", async () => {
    mockApproveQueries({ claimWins: true, escrowLine: true })
    await approveSettlement(CARRIER, SETTLEMENT, ACTOR)
    const claim = queryMock.mock.calls.find(([sql]) => String(sql).includes("SET status = 'approved'"))
    expect(claim).toBeDefined()
    const claimSql = String(claim![0])
    expect(claimSql).toContain("WHERE carrier_id = $1 AND id = $2 AND status = 'draft'")
    expect(claimSql).toContain("RETURNING id")
    expect(claim![1]).toEqual([CARRIER, SETTLEMENT, ACTOR.id])
    // The escrow append is NOT idempotent — the claim must come first so a
    // double-approve can never grow the ledger twice.
    const claimIndex = queryMock.mock.calls.findIndex(([sql]) => String(sql).includes("SET status = 'approved'"))
    const escrowIndex = queryMock.mock.calls.findIndex(([sql]) => String(sql).includes("INSERT INTO hub.escrow_ledger"))
    expect(escrowIndex).toBeGreaterThan(claimIndex)
  })

  it("statement_url write is carrier-scoped", async () => {
    mockApproveQueries({ claimWins: true })
    await approveSettlement(CARRIER, SETTLEMENT, ACTOR)
    const urlWrite = queryMock.mock.calls.find(([sql]) => String(sql).includes("SET statement_url"))
    expect(urlWrite).toBeDefined()
    expect(String(urlWrite![0])).toContain("WHERE carrier_id = $1 AND id = $2")
  })

  it("a race loser (claim matched no row) throws and performs no side effects", async () => {
    mockApproveQueries({ claimWins: false, escrowLine: true })
    await expect(approveSettlement(CARRIER, SETTLEMENT, ACTOR)).rejects.toThrow("Only drafts can be approved")
    const sqls = queryMock.mock.calls.map(([sql]) => String(sql))
    expect(sqls.some((s) => s.includes("INSERT INTO hub.escrow_ledger"))).toBe(false)
    expect(sqls.some((s) => s.includes("UPDATE hub.advances"))).toBe(false)
    expect(sqls.some((s) => s.includes("SET statement_url"))).toBe(false)
  })
})

describe("getSettlementLines carrier-guards via settlements join", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
  })

  it("joins hub.settlements on carrier_id = $1 (not settlement-id-only)", async () => {
    await getSettlementLines(CARRIER, SETTLEMENT)
    const linesLookup = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("FROM hub.settlement_lines")
    )
    expect(linesLookup).toBeDefined()
    expect(String(linesLookup![0])).toContain("JOIN hub.settlements s ON s.id = sl.settlement_id AND s.carrier_id = $1")
    expect(linesLookup![1]).toEqual([CARRIER, SETTLEMENT])
  })
})
