import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))
vi.mock("../invoices", () => ({ getInvoice: vi.fn(async () => null), recordPayment: vi.fn(async () => ({})) }))
vi.mock("../documents", () => ({ listDocuments: vi.fn(async () => []) }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => {}) }))

import { query, queryOne } from "../db"
import { getCredentials, hasCredentials } from "../credentials"
import { getInvoice, recordPayment } from "../invoices"
import { listDocuments } from "../documents"
import { logAudit } from "../audit"
import { normalizeFactorEvent, processFactorEvent, submitInvoiceToFactor } from "../integrations/factor"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const getInvoiceMock = vi.mocked(getInvoice)
const recordPaymentMock = vi.mocked(recordPayment)
const listDocumentsMock = vi.mocked(listDocuments)
const logAuditMock = vi.mocked(logAudit)

const CARRIER = "44444444-4444-4444-4444-444444444444"
const ACTOR = { id: "user-1", name: "Owner" }

function mockFetchOnce(response: { ok: boolean; status?: number }) {
  const fn = vi.fn(async () => response)
  vi.stubGlobal("fetch", fn)
  return fn
}

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([])
  queryOneMock.mockReset().mockResolvedValue(null)
  getCredentialsMock.mockReset()
  hasCredentialsMock.mockReset()
  getInvoiceMock.mockReset()
  recordPaymentMock.mockReset().mockResolvedValue({} as never)
  listDocumentsMock.mockReset().mockResolvedValue([])
  logAuditMock.mockReset()
  vi.unstubAllGlobals()
})

describe("normalizeFactorEvent (pure — the one place the assumed webhook shape is read)", () => {
  it("reads invoiceNumber/amount under any of the assumed field names", () => {
    expect(normalizeFactorEvent({ invoiceNumber: "INV-1", amount: 100 }).invoiceNumber).toBe("INV-1")
    expect(normalizeFactorEvent({ referenceNumber: "INV-2", advanceAmount: "50.25" })).toEqual({
      invoiceNumber: "INV-2", amountCents: 5025, paidOn: expect.any(String),
    })
    expect(normalizeFactorEvent({ clientReference: "INV-3", netAmount: 10 }).invoiceNumber).toBe("INV-3")
  })

  it("reports nulls instead of guessing when fields are absent", () => {
    const row = normalizeFactorEvent({})
    expect(row.invoiceNumber).toBeNull()
    expect(row.amountCents).toBeNull()
  })

  it("uses the provider's fundedAt date when present", () => {
    expect(normalizeFactorEvent({ fundedAt: "2026-06-15T10:00:00Z" }).paidOn).toBe("2026-06-15")
  })
})

describe("processFactorEvent", () => {
  it("ignores event kinds it doesn't understand instead of guessing", async () => {
    const outcome = await processFactorEvent(CARRIER, { external_id: "e1", kind: "invoice.rejected", payload: {} })
    expect(outcome).toEqual({ applied: false, invoiceNumber: null, reason: expect.stringContaining("unhandled event kind") })
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("refuses an incomplete payload rather than recording a bad payment", async () => {
    const outcome = await processFactorEvent(CARRIER, { external_id: "e1", kind: "invoice.funded", payload: { invoiceNumber: "INV-1" } })
    expect(outcome.applied).toBe(false)
    expect(outcome.reason).toMatch(/missing invoice reference or amount/)
    expect(recordPaymentMock).not.toHaveBeenCalled()
  })

  it("reports no matching invoice rather than creating one", async () => {
    queryOneMock.mockResolvedValueOnce(null)
    const outcome = await processFactorEvent(CARRIER, {
      external_id: "e1", kind: "invoice.funded", payload: { invoiceNumber: "INV-404", amount: 100 },
    })
    expect(outcome).toEqual({ applied: false, invoiceNumber: "INV-404", reason: "no matching invoice" })
  })

  it("skips a payment that was already recorded for this event (idempotent replay)", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "invoice-1" }).mockResolvedValueOnce({ id: "payment-1" })
    const outcome = await processFactorEvent(CARRIER, {
      external_id: "e1", kind: "invoice.funded", payload: { invoiceNumber: "INV-1", amount: 100 },
    })
    expect(outcome).toEqual({ applied: false, invoiceNumber: "INV-1", reason: "already recorded" })
    expect(recordPaymentMock).not.toHaveBeenCalled()
  })

  it("records a payment via the SAME recordPayment the office 'record a payment' form uses", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "invoice-1" }).mockResolvedValueOnce(null)
    const outcome = await processFactorEvent(CARRIER, {
      external_id: "evt-9", kind: "advance.paid", payload: { invoiceNumber: "INV-1", amount: 875.5, fundedAt: "2026-06-01" },
    })
    expect(outcome).toEqual({ applied: true, invoiceNumber: "INV-1" })
    expect(recordPaymentMock).toHaveBeenCalledWith(
      CARRIER, "invoice-1",
      { amountCents: 87550, paidOn: "2026-06-01", method: "factor-advance", reference: "factor:evt-9" },
      { id: "system:factor", name: "Factoring webhook" }
    )
  })
})

describe("submitInvoiceToFactor", () => {
  it("reports not connected without credentials, no fetch attempted", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    const result = await submitInvoiceToFactor(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: false })
    expect(getInvoiceMock).not.toHaveBeenCalled()
  })

  it("short-circuits on a second submission instead of double-billing the factor", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "key" })
    getInvoiceMock.mockResolvedValue({
      id: "invoice-1", number: "INV-1", amount_cents: 10000, load_id: "load-1", customer_name: "Acme",
      sent_log: [{ to: "factor-api", at: "2026-06-01", kind: "factor-submission" }],
    } as never)
    const fetchMock = mockFetchOnce({ ok: true })
    const result = await submitInvoiceToFactor(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: true, alreadySubmitted: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("submits reference/amount/document refs and records the submission", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "key" })
    getInvoiceMock.mockResolvedValue({
      id: "invoice-1", number: "INV-1", amount_cents: 125050, load_id: "load-1", customer_name: "Acme", sent_log: [],
    } as never)
    listDocumentsMock.mockResolvedValue([
      { kind: "rate_confirmation", url: "/docs/rc.pdf" },
      { kind: "pod", url: "/docs/pod.pdf" },
      { kind: "insurance", url: "/docs/ins.pdf" },
    ] as never)
    const fetchMock = mockFetchOnce({ ok: true })

    const result = await submitInvoiceToFactor(CARRIER, "invoice-1", ACTOR)

    expect(result).toEqual({ connected: true, submitted: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/invoices$/)
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key")
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({
      referenceNumber: "INV-1", amount: 1250.5, debtorName: "Acme",
      documents: [{ kind: "rate_confirmation", url: "/docs/rc.pdf" }, { kind: "pod", url: "/docs/pod.pdf" }],
    })
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.invoices SET sent_log"), expect.any(Array))
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({ action: "factor-submission" }))
  })

  it("surfaces a non-OK submission response as an error rather than marking it sent", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "key" })
    getInvoiceMock.mockResolvedValue({
      id: "invoice-1", number: "INV-1", amount_cents: 100, load_id: "load-1", customer_name: "Acme", sent_log: [],
    } as never)
    mockFetchOnce({ ok: false, status: 500 })
    await expect(submitInvoiceToFactor(CARRIER, "invoice-1", ACTOR)).rejects.toThrow(/500/)
    expect(queryMock).not.toHaveBeenCalled()
  })
})
