/**
 * SQL-shape tests pinning the carrier guard on every hub.payments read and
 * the invoice-status write (AGENTS.md: every query carrier-scoped; joins and
 * correlated subqueries guard carrier_id on BOTH sides, not just via the
 * already-scoped invoice row).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ name: "Test Carrier" })),
  getCarrierSettings: vi.fn(async () => ({ notifications: { officeEmail: "office@example.com" } })),
}))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(() => ({ sendMail: vi.fn(async () => undefined) })),
  isEmailConfigured: vi.fn(() => false),
  mailFrom: vi.fn(() => "test@example.com"),
}))

import { hubDb, query, queryOne } from "../db"
import { getInvoice, listInvoicePayments, recordPayment } from "../invoices"
import { avgDaysToPay, creditExposure } from "../vetting"
import { exportCsv } from "../expenses"
import { getDashboardStats } from "../loads"
import { sendOwnerDigest } from "../digest"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const hubDbMock = vi.mocked(hubDb)

const CARRIER = "11111111-1111-1111-1111-111111111111"

/** SQL of the most recent query/queryOne call, then reset so calls can't interleave. */
function lastSql(): string {
  const calls = [...queryMock.mock.calls, ...queryOneMock.mock.calls]
  queryMock.mockClear()
  queryOneMock.mockClear()
  return String(calls[calls.length - 1][0])
}

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockClear()
  hubDbMock.mockReset()
})

describe("hub.payments reads are carrier-guarded on both sides", () => {
  it("invoice detail payments list is scoped by carrier, not invoice id alone", async () => {
    await listInvoicePayments(CARRIER, "inv-1")
    expect(lastSql()).toContain("WHERE carrier_id = $1 AND invoice_id = $2")
  })

  it("invoice paid_cents subquery guards the payments side", async () => {
    await getInvoice(CARRIER, "inv-1")
    expect(lastSql()).toContain(
      "FROM hub.payments WHERE invoice_id = i.id AND carrier_id = i.carrier_id"
    )
  })

  it("payment-speed analytics guard the payments/invoices join", async () => {
    await avgDaysToPay(CARRIER, "cust-1")
    expect(lastSql()).toContain("ON i.id = p.invoice_id AND i.carrier_id = p.carrier_id")
  })

  it("credit exposure guards the paid lateral", async () => {
    await creditExposure(CARRIER, "cust-1")
    expect(lastSql()).toContain("WHERE invoice_id = i.id AND carrier_id = i.carrier_id")
  })

  it("QuickBooks payments CSV guards the invoices join", async () => {
    await exportCsv(CARRIER, "payments")
    expect(lastSql()).toContain("ON i.id = p.invoice_id AND i.carrier_id = p.carrier_id")
  })

  it("dashboard AR-open stat guards the paid lateral", async () => {
    await getDashboardStats(CARRIER)
    expect(lastSql()).toContain("WHERE invoice_id = i.id AND carrier_id = i.carrier_id")
  })

  it("owner digest AR-open stat guards the paid lateral", async () => {
    await sendOwnerDigest(CARRIER)
    const sql = [...queryMock.mock.calls, ...queryOneMock.mock.calls]
      .map((c) => String(c[0]))
      .find((s) => s.includes("hub.payments"))
    expect(sql).toContain("WHERE invoice_id = i.id AND carrier_id = i.carrier_id")
  })
})

describe("recordPayment write scoping", () => {
  it("scopes the transactional insert + status update by carrier_id, not id alone", async () => {
    queryOneMock.mockResolvedValueOnce({
      id: "inv-1", carrier_id: CARRIER, load_id: "load-1",
      amount_cents: 100000, paid_cents: 0, status: "sent",
    })
    const clientQuery = vi.fn(async (text: string, params: unknown[] = []) => {
      const sql = String(text)
      if (sql.includes("UPDATE hub.invoices SET status")) return { rows: [{ status: "partial" }] }
      return { rows: [] }
    })
    hubDbMock.mockReturnValue({
      connect: vi.fn(async () => ({ query: clientQuery, release: vi.fn() })),
    } as never)

    await recordPayment(
      CARRIER, "inv-1",
      { amountCents: 40000, paidOn: "2026-07-05" },
      { id: "user-1", name: "Test User" }
    )

    const insert = clientQuery.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.payments"))
    expect(insert).toBeDefined()
    expect(insert![1]).toEqual([CARRIER, "inv-1", 40000, "2026-07-05", null, null])

    const lock = clientQuery.mock.calls.find(([sql]) => String(sql).includes("FOR UPDATE"))
    expect(lock).toBeDefined()
    expect(lock![1]).toEqual(["inv-1", CARRIER])

    const update = clientQuery.mock.calls.find(([sql]) => String(sql).includes("UPDATE hub.invoices SET status"))
    expect(update).toBeDefined()
    expect(String(update![0])).toContain("WHERE id = $1 AND carrier_id = $2")
    expect(update![1]).toEqual(["inv-1", CARRIER])
  })
})
