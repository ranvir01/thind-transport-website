/**
 * Customer statement rollup + send: groups open invoices per customer to the
 * cent, skips customers with nothing open, and refuses to send without a
 * billing email on file. SMTP-unconfigured send stays graceful (like invoice
 * creation) instead of throwing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, isEmailConfigured, sendMail } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  isEmailConfigured: vi.fn(),
  sendMail: vi.fn(async () => undefined),
}))

vi.mock("../db", () => ({
  query: queryMock,
  queryOne: vi.fn(async () => null),
}))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ id: "carrier-1", name: "Thind Transport", address: "123 Main St" })),
  getCarrierSettings: vi.fn(async () => ({
    invoice: { defaultTermsDays: 30 },
    factoring: { remitName: null, remitAddress: null },
    branding: { accent: null },
  })),
  nextInvoiceNumber: vi.fn(async () => "THD-INV-1001"),
}))
vi.mock("../loads", () => ({
  getLoad: vi.fn(async () => null),
  getLoadStops: vi.fn(async () => []),
  changeLoadStatus: vi.fn(async () => undefined),
}))
vi.mock("../customers", () => ({
  getCustomer: vi.fn(async () => null),
}))
vi.mock("../documents", () => ({
  listDocuments: vi.fn(async () => []),
  storeGeneratedPdf: vi.fn(async () => "/generated/x.pdf"),
}))
vi.mock("../pdf", () => ({
  buildInvoicePdf: vi.fn(async () => new Uint8Array([1])),
  buildStatementPdf: vi.fn(async () => new Uint8Array([2])),
}))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured,
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn(() => "billing@test"),
}))

import {
  getCustomerStatementDetail, getCustomerStatements, sendCustomerStatement,
} from "../invoices"

const OPEN_ROWS = [
  {
    id: "inv-1", customer_id: "cust-1", customer_name: "Cascade Produce Co.",
    billing_email: "ap@cascade.test", load_reference: "THD-1001",
    amount_cents: 300000, paid_cents: 0, due_on: "2020-01-01", status: "sent",
  },
  {
    id: "inv-2", customer_id: "cust-1", customer_name: "Cascade Produce Co.",
    billing_email: "ap@cascade.test", load_reference: "THD-1002",
    amount_cents: 150000, paid_cents: 50000, due_on: "2020-01-15", status: "partial",
  },
  {
    id: "inv-3", customer_id: "cust-2", customer_name: "No Email Freight",
    billing_email: null, load_reference: "THD-1003",
    amount_cents: 90000, paid_cents: 90000, due_on: "2020-01-10", status: "paid",
  },
]

const NO_EMAIL_OPEN_ROW = {
  id: "inv-4", customer_id: "cust-3", customer_name: "Ghost Freight LLC",
  billing_email: null, load_reference: "THD-1004",
  amount_cents: 50000, paid_cents: 0, due_on: "2020-01-05", status: "sent",
}

describe("getCustomerStatements", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue(OPEN_ROWS)
  })

  it("groups open invoices per customer and sums exact open cents", async () => {
    const statements = await getCustomerStatements("carrier-1")
    expect(statements).toHaveLength(1) // cust-2's only invoice is fully paid
    const [cascade] = statements
    expect(cascade.customerId).toBe("cust-1")
    expect(cascade.invoices).toHaveLength(2)
    expect(cascade.totalOpenCents).toBe(300000 + (150000 - 50000))
  })

  it("returns null detail for a customer with no open balance", async () => {
    queryMock.mockResolvedValue(OPEN_ROWS.filter((r) => r.customer_id === "cust-2"))
    const detail = await getCustomerStatementDetail("carrier-1", "cust-2")
    expect(detail).toBeNull()
  })
})

describe("sendCustomerStatement", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue(OPEN_ROWS.filter((r) => r.customer_id === "cust-1"))
    sendMail.mockClear()
    isEmailConfigured.mockReturnValue(true)
  })

  it("refuses to send without a billing email on file", async () => {
    queryMock.mockResolvedValue([NO_EMAIL_OPEN_ROW])
    await expect(
      sendCustomerStatement("carrier-1", "cust-3", { id: "u1", name: "Office" })
    ).rejects.toThrow(/billing email/i)
  })

  it("refuses to send when the customer has no open invoices", async () => {
    queryMock.mockResolvedValue(OPEN_ROWS.filter((r) => r.customer_id === "cust-2"))
    await expect(
      sendCustomerStatement("carrier-1", "cust-2", { id: "u1", name: "Office" })
    ).rejects.toThrow(/no open invoices/i)
  })

  it("emails one PDF with the exact rolled-up total when SMTP is configured", async () => {
    const result = await sendCustomerStatement("carrier-1", "cust-1", { id: "u1", name: "Office" })
    expect(result.emailed).toBe(true)
    expect(result.to).toBe("ap@cascade.test")
    expect(result.totalOpenCents).toBe(300000 + 100000)
    expect(result.invoiceCount).toBe(2)
    expect(sendMail).toHaveBeenCalledTimes(1)
    const call = sendMail.mock.calls[0][0]
    expect(call.to).toBe("ap@cascade.test")
    expect(call.attachments).toHaveLength(1)
  })

  it("stays graceful (no throw) when SMTP is unconfigured", async () => {
    isEmailConfigured.mockReturnValue(false)
    const result = await sendCustomerStatement("carrier-1", "cust-1", { id: "u1", name: "Office" })
    expect(result.emailed).toBe(false)
    expect(result.error).toMatch(/Email not configured/)
    expect(sendMail).not.toHaveBeenCalled()
  })
})
