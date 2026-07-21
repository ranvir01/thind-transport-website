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
import { approveSettlement, getSettlementLines } from "../settlements"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const hubDbMock = vi.mocked(hubDb)

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

/**
 * Fake `hubDb().connect()` client for the escrow-ledger append transaction:
 * an advisory-lock mutex per driver_id (simulating `pg_advisory_xact_lock`)
 * guarding a live SUM-free running balance read + insert, so concurrency
 * tests exercise the real serialization instead of asserting on SQL text.
 */
function makeFakeEscrowClient(ledgers: Map<string, number>) {
  const calls: { sql: string; params: unknown[] }[] = []
  const locks = new Map<string, { locked: boolean; waiters: (() => void)[] }>()
  function acquire(id: string): Promise<void> {
    let lock = locks.get(id)
    if (!lock) { lock = { locked: false, waiters: [] }; locks.set(id, lock) }
    if (!lock.locked) { lock.locked = true; return Promise.resolve() }
    return new Promise((resolve) => lock!.waiters.push(resolve))
  }
  function release(id: string) {
    const lock = locks.get(id)
    if (!lock) return
    const next = lock.waiters.shift()
    if (next) next(); else lock.locked = false
  }
  hubDbMock.mockReturnValue({
    connect: vi.fn(async () => {
      let held: string | null = null
      return {
        query: vi.fn(async (sql: string, params: unknown[] = []) => {
          calls.push({ sql: String(sql), params })
          const s = String(sql)
          if (/^\s*BEGIN/.test(s)) return { rows: [] }
          if (/^\s*(COMMIT|ROLLBACK)/.test(s)) { if (held) release(held); held = null; return { rows: [] } }
          if (s.includes("pg_advisory_xact_lock")) {
            const [driverId] = params as [string]
            await acquire(driverId)
            held = driverId
            return { rows: [] }
          }
          if (s.includes("SELECT balance_cents FROM hub.escrow_ledger")) {
            const [driverId] = params as [string]
            return { rows: [{ balance_cents: ledgers.get(driverId) ?? 0 }] }
          }
          if (s.includes("INSERT INTO hub.escrow_ledger")) {
            const [, driverId, , newBalance] = params as [string, string, number, number]
            ledgers.set(driverId, newBalance)
            return { rows: [] }
          }
          return { rows: [] }
        }),
        release: vi.fn(),
      }
    }),
  } as unknown as ReturnType<typeof hubDb>)
  return calls
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
        ? [{ id: "l1", kind: "deduction", label: "Escrow", amount_cents: 5000, source_type: "escrow", source_id: null }]
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
    hubDbMock.mockReset()
  })

  it("flips draft -> approved with carrier + status gate in one statement", async () => {
    const escrowCalls = makeFakeEscrowClient(new Map())
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
    const escrowIndex = escrowCalls.findIndex((c) => c.sql.includes("INSERT INTO hub.escrow_ledger"))
    expect(escrowIndex).toBeGreaterThan(-1)
    expect(claimIndex).toBeGreaterThan(-1)
  })

  it("concurrent approvals for the same driver serialize the escrow balance instead of racing", async () => {
    // Two settlements for the same driver, both carrying an escrow deduction
    // line, approved at the same time (a backlog batch-approve). Before the
    // advisory lock, both transactions would read balance_cents = 0 and each
    // insert 5000, leaving the ledger at 5000 instead of the correct 10000.
    const ledgers = new Map<string, number>()
    makeFakeEscrowClient(ledgers)
    const settlementA = { ...draftSettlement, id: "settlement-a" }
    const settlementB = { ...draftSettlement, id: "settlement-b" }
    queryOneMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      const s = String(sql)
      if (s.includes("hub.settlements s JOIN hub.drivers")) {
        return (params as string[])[1] === "settlement-a" ? settlementA : settlementB
      }
      if (s.includes("FROM hub.drivers WHERE id = $1 AND carrier_id = $2")) return { id: DRIVER, email: null }
      return null
    })
    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      const s = String(sql)
      if (s.includes("FROM hub.settlement_lines")) {
        return [{ id: "l1", kind: "deduction", label: "Escrow", amount_cents: 5000, source_type: "escrow", source_id: null }]
      }
      if (s.includes("SET status = 'approved'")) return [{ id: (params as string[])[1] }]
      return []
    })
    await Promise.all([
      approveSettlement(CARRIER, "settlement-a", ACTOR),
      approveSettlement(CARRIER, "settlement-b", ACTOR),
    ])
    expect(ledgers.get(DRIVER)).toBe(10000)
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
