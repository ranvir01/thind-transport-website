/**
 * 2026-07-21 invoices/payments (AR) subsystem audit: recordPayment derives the
 * invoice's status ('partial'/'paid') and the load-status cascade directly from
 * amountCents, so a zero or negative amount would insert a junk hub.payments
 * row and rewrite the invoice's status off it (an unpaid invoice flips to
 * 'partial', a paid one downgrades). Every caller validates upstream — the
 * office form, runQboSync, processFactorEvent — and this pins the lib-level
 * backstop plus the status derivation itself.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { changeLoadStatus, getLoad } = vi.hoisted(() => ({
  changeLoadStatus: vi.fn(),
  getLoad: vi.fn(),
}))

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
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

import { query, queryOne } from "../db"
import { logAudit } from "../audit"
import { recordPayment } from "../invoices"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
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
  logAuditMock.mockClear()
  changeLoadStatus.mockClear()
  getLoad.mockReset()
})

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
    await recordPayment(CARRIER, "inv-1", { amountCents: 40_000, paidOn: "2026-07-21" }, ACTOR)

    const statusUpdate = queryMock.mock.calls.find(([sql]) => sql.includes("UPDATE hub.invoices SET status"))
    expect(statusUpdate?.[1]).toEqual(["inv-1", "partial", CARRIER])
    expect(changeLoadStatus).not.toHaveBeenCalled()
  })

  it("marks the invoice 'paid' at full balance and cascades the invoiced load to paid", async () => {
    queryOneMock.mockResolvedValue({ ...INVOICE, paid_cents: 60_000 })
    getLoad.mockResolvedValue({ id: "load-1", status: "invoiced", settlement_id: null })
    await recordPayment(CARRIER, "inv-1", { amountCents: 40_000, paidOn: "2026-07-21" }, ACTOR)

    const statusUpdate = queryMock.mock.calls.find(([sql]) => sql.includes("UPDATE hub.invoices SET status"))
    expect(statusUpdate?.[1]).toEqual(["inv-1", "paid", CARRIER])
    expect(changeLoadStatus).toHaveBeenCalledWith(CARRIER, "load-1", "paid", ACTOR)
  })
})
