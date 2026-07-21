/**
 * 2026-07-21 invoices/payments (AR) subsystem audit: recordPayment derives the
 * invoice's status ('partial'/'paid') and the load-status cascade directly from
 * amountCents, so a zero or negative amount would insert a junk hub.payments
 * row and rewrite the invoice's status off it (an unpaid invoice flips to
 * 'partial', a paid one downgrades). Every caller validates upstream — the
 * office form, runQboSync, processFactorEvent — and this pins the lib-level
 * backstop plus the status derivation itself.
 *
 * 2026-07-21 follow-up: the status derivation originally read invoice.paid_cents
 * from the pre-insert getInvoice() call, then wrote status = f(that stale total).
 * Two concurrent payments both read the same stale total, so a fully-paid
 * invoice could get stuck at 'partial' (whichever UPDATE landed last won with
 * the wrong number). Fixed by moving the insert + status derivation into a
 * single transaction that locks the invoice row (FOR UPDATE) and computes the
 * new status from a live SUM over hub.payments in the same UPDATE statement.
 * The concurrency test below exercises that against an in-memory fake of the
 * locked table instead of asserting on hardcoded SQL param arrays.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { changeLoadStatus, getLoad } = vi.hoisted(() => ({
  changeLoadStatus: vi.fn(),
  getLoad: vi.fn(),
}))

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => null),
  getCarrierSettings: vi.fn(async () => ({})),
  nextInvoiceNumber: vi.fn(async () => "THD-INV-1001"),
}))
vi.mock("../loads", () => ({
  getLoad,
  getLoadStops: vi.fn(async () => []),
  changeLoadStatus,
}))
vi.mock("../customers", () => ({ getCustomer: vi.fn(async () => null) }))
vi.mock("../documents", () => ({
  listDocuments: vi.fn(async () => []),
  storeGeneratedPdf: vi.fn(async () => "/generated/x.pdf"),
}))
vi.mock("../pdf", () => ({ buildInvoicePdf: vi.fn(), buildStatementPdf: vi.fn() }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => false),
  createMailTransport: vi.fn(),
  mailFrom: vi.fn(() => "billing@test"),
}))

import { hubDb, query, queryOne } from "../db"
import { logAudit } from "../audit"
import { recordPayment } from "../invoices"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const hubDbMock = vi.mocked(hubDb)
const logAuditMock = vi.mocked(logAudit)
const CARRIER = "carrier-1"
const ACTOR = { id: "u1", name: "Office" }

const INVOICE = {
  id: "inv-1", carrier_id: CARRIER, number: "THD-INV-1001", customer_id: "cust-1",
  load_id: "load-1", amount_cents: 100_000, status: "sent", paid_cents: 0,
}

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockReset()
  hubDbMock.mockReset()
  logAuditMock.mockClear()
  changeLoadStatus.mockClear()
  getLoad.mockReset()
})

/**
 * In-memory stand-in for the locked hub.invoices/hub.payments transaction
 * recordPayment now runs: a mutex per invoice id (simulating `FOR UPDATE`)
 * and a live SUM-over-payments status derivation, so concurrency tests exercise
 * the real serialization behavior instead of hardcoded SQL params.
 */
function makeFakeDb(invoices: Map<string, { amount_cents: number; status?: string }>) {
  const payments: { carrier_id: string; invoice_id: string; amount_cents: number }[] = []
  const locks = new Map<string, { locked: boolean; waiters: (() => void)[] }>()

  function acquire(id: string): Promise<void> {
    let lock = locks.get(id)
    if (!lock) {
      lock = { locked: false, waiters: [] }
      locks.set(id, lock)
    }
    if (!lock.locked) {
      lock.locked = true
      return Promise.resolve()
    }
    return new Promise((resolve) => lock!.waiters.push(resolve))
  }

  function release(id: string) {
    const lock = locks.get(id)
    if (!lock) return
    const next = lock.waiters.shift()
    if (next) {
      next()
    } else {
      lock.locked = false
    }
  }

  hubDbMock.mockReturnValue({
    connect: vi.fn(async () => {
      let held: string | null = null
      return {
        query: vi.fn(async (text: string, params: unknown[] = []) => {
          const sql = String(text)
          if (/^\s*BEGIN/.test(sql)) return { rows: [] }
          if (/^\s*(COMMIT|ROLLBACK)/.test(sql)) {
            if (held) release(held)
            held = null
            return { rows: [] }
          }
          if (sql.includes("FOR UPDATE")) {
            const [id] = params as [string]
            await acquire(id)
            held = id
            return { rows: [{ id }] }
          }
          if (sql.includes("INSERT INTO hub.payments")) {
            const [carrierId, invoiceId, amountCents] = params as [string, string, number]
            payments.push({ carrier_id: carrierId, invoice_id: invoiceId, amount_cents: amountCents })
            return { rows: [] }
          }
          if (sql.includes("UPDATE hub.invoices SET status")) {
            const [invoiceId, carrierId] = params as [string, string]
            const invoice = invoices.get(invoiceId)!
            const paid = payments
              .filter((p) => p.invoice_id === invoiceId && p.carrier_id === carrierId)
              .reduce((sum, p) => sum + p.amount_cents, 0)
            invoice.status = paid >= invoice.amount_cents ? "paid" : "partial"
            return { rows: [{ status: invoice.status }] }
          }
          throw new Error(`unexpected query in fake client: ${sql}`)
        }),
        release: vi.fn(),
      }
    }),
  } as never)

  return { invoices, payments }
}

describe("recordPayment amount validation (lib-level backstop)", () => {
  it.each([
    ["zero", 0],
    ["negative", -2500],
    ["non-integer cents", 40.5],
    ["NaN", Number.NaN],
  ])("throws on a %s amount before touching the database", async (_label, amountCents) => {
    await expect(
      recordPayment(CARRIER, "inv-1", { amountCents, paidOn: "2026-07-21" }, ACTOR)
    ).rejects.toThrow(/positive number of cents/)
    expect(queryOneMock).not.toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})

describe("recordPayment status derivation", () => {
  it("marks the invoice 'partial' when the payment doesn't cover the balance", async () => {
    queryOneMock.mockResolvedValue(INVOICE)
    const { invoices } = makeFakeDb(new Map([["inv-1", { amount_cents: 100_000 }]]))

    await recordPayment(CARRIER, "inv-1", { amountCents: 40_000, paidOn: "2026-07-21" }, ACTOR)

    expect(invoices.get("inv-1")!.status).toBe("partial")
    expect(changeLoadStatus).not.toHaveBeenCalled()
  })

  it("marks the invoice 'paid' at full balance and cascades the invoiced load to paid", async () => {
    queryOneMock.mockResolvedValue({ ...INVOICE, paid_cents: 60_000 })
    getLoad.mockResolvedValue({ id: "load-1", status: "invoiced", settlement_id: null })
    const { invoices, payments } = makeFakeDb(new Map([["inv-1", { amount_cents: 100_000 }]]))
    payments.push({ carrier_id: CARRIER, invoice_id: "inv-1", amount_cents: 60_000 })

    await recordPayment(CARRIER, "inv-1", { amountCents: 40_000, paidOn: "2026-07-21" }, ACTOR)

    expect(invoices.get("inv-1")!.status).toBe("paid")
    expect(changeLoadStatus).toHaveBeenCalledWith(CARRIER, "load-1", "paid", ACTOR)
  })
})

describe("recordPayment concurrency (regression: stale paid_cents race)", () => {
  it("lands both payments and reaches 'paid' even though both reads see the invoice pre-insert", async () => {
    // Both concurrent calls resolve the SAME pre-insert getInvoice() read
    // (paid_cents: 0) — the old code derived status from this stale value, so
    // whichever UPDATE landed last decided status off only its own payment,
    // losing the other one. The fix derives status from a live, lock-serialized
    // SUM over hub.payments instead, so the combined total always wins.
    queryOneMock.mockResolvedValue(INVOICE)
    const { invoices, payments } = makeFakeDb(new Map([["inv-1", { amount_cents: 100_000 }]]))

    await Promise.all([
      recordPayment(CARRIER, "inv-1", { amountCents: 60_000, paidOn: "2026-07-21" }, ACTOR),
      recordPayment(CARRIER, "inv-1", { amountCents: 40_000, paidOn: "2026-07-21" }, ACTOR),
    ])

    expect(payments).toHaveLength(2)
    expect(invoices.get("inv-1")!.status).toBe("paid")
  })
})
