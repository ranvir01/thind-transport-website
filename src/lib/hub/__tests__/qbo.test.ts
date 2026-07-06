import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
  saveCredentials: vi.fn(async () => undefined),
}))
vi.mock("../invoices", () => ({ getInvoice: vi.fn(async () => null), recordPayment: vi.fn(async () => ({})) }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => {}) }))

import { query, queryOne } from "../db"
import { getCredentials, hasCredentials, saveCredentials } from "../credentials"
import { getInvoice, recordPayment } from "../invoices"
import { logAudit } from "../audit"
import { normalizeQboPayment, pushInvoiceToQbo, qboSource, runQboSync } from "../integrations/qbo"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const saveCredentialsMock = vi.mocked(saveCredentials)
const getInvoiceMock = vi.mocked(getInvoice)
const recordPaymentMock = vi.mocked(recordPayment)
const logAuditMock = vi.mocked(logAudit)
const CARRIER = "33333333-3333-3333-3333-333333333333"
const ACTOR = { id: "user-1", name: "Owner" }

const CREDS = { clientId: "cid", clientSecret: "csec", refreshToken: "rtok", realmId: "9130000000000000" }

function mockFetchSequence(...responses: Array<{ ok: boolean; status?: number; json: () => Promise<unknown> }>) {
  const fn = vi.fn()
  for (const r of responses) fn.mockImplementationOnce(async () => r)
  vi.stubGlobal("fetch", fn)
  return fn
}

describe("normalizeQboPayment (pure — the one place the assumed QBO shape is read)", () => {
  it("resolves the linked invoice via the TxnId → DocNumber map", () => {
    const map = new Map([["87", "INV-1042"]])
    const row = normalizeQboPayment(
      {
        Id: "8945",
        TotalAmt: 1250.5,
        TxnDate: "2026-06-20",
        PaymentRefNum: "ACH-2291",
        Line: [{ Amount: 1250.5, LinkedTxn: [{ TxnId: "87", TxnType: "Invoice" }] }],
      },
      map
    )
    expect(row).toEqual({
      external_id: "8945",
      invoiceNumber: "INV-1042",
      amountCents: 125050,
      paidOn: "2026-06-20",
      method: "ACH-2291",
      raw: expect.any(Object),
    })
  })

  it("reports invoiceNumber: null instead of guessing when no match exists", () => {
    const row = normalizeQboPayment({ Id: "1", TotalAmt: 10, Line: [] }, new Map())
    expect(row.invoiceNumber).toBeNull()
    expect(row.external_id).toBe("1")
    expect(row.method).toBeNull()
  })
})

describe("qboSource (SyncSource<QboPaymentRow> contract)", () => {
  beforeEach(() => {
    getCredentialsMock.mockReset()
    hasCredentialsMock.mockReset()
    saveCredentialsMock.mockClear()
  })

  it("reports not connected without credentials, and pull refuses instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = qboSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.pull()).rejects.toThrow(/not connected/)
  })

  it("refreshes a token, pulls payments, and resolves invoice numbers via a second query", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      {
        ok: true,
        json: async () => ({
          QueryResponse: {
            Payment: [
              { Id: "A", TotalAmt: 40, TxnDate: "2026-06-01", Line: [{ LinkedTxn: [{ TxnId: "87", TxnType: "Invoice" }] }] },
            ],
          },
        }),
      },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "87", DocNumber: "INV-9" }] } }) }
    )
    const rows = await qboSource(CARRIER).pull()
    expect(rows).toEqual([
      { external_id: "A", invoiceNumber: "INV-9", amountCents: 4000, paidOn: "2026-06-01", method: null, raw: expect.any(Object) },
    ])
  })

  it("skips the invoice lookup query entirely when no payment links an invoice", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    const fetchMock = mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: { Payment: [{ Id: "A", TotalAmt: 10, Line: [] }] } }) }
    )
    const rows = await qboSource(CARRIER).pull()
    expect(rows[0].invoiceNumber).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("surfaces a non-OK token response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence({ ok: false, status: 401, json: async () => ({}) })
    await expect(qboSource(CARRIER).pull()).rejects.toThrow(/401/)
  })

  it("persists a rotated refresh token so the next sync doesn't redeem a stale one", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok", refresh_token: "rtok-new" }) },
      { ok: true, json: async () => ({ QueryResponse: { Payment: [] } }) }
    )
    await qboSource(CARRIER).pull()
    expect(saveCredentialsMock).toHaveBeenCalledWith(
      CARRIER,
      "qbo",
      { ...CREDS, refreshToken: "rtok-new" },
      "system:qbo"
    )
  })

  it("does not write credentials back when QBO returns the same refresh token", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok", refresh_token: CREDS.refreshToken }) },
      { ok: true, json: async () => ({ QueryResponse: { Payment: [] } }) }
    )
    await qboSource(CARRIER).pull()
    expect(saveCredentialsMock).not.toHaveBeenCalled()
  })

  it("does not write credentials back when the token response omits refresh_token", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: { Payment: [] } }) }
    )
    await qboSource(CARRIER).pull()
    expect(saveCredentialsMock).not.toHaveBeenCalled()
  })
})

describe("runQboSync", () => {
  beforeEach(() => {
    hasCredentialsMock.mockReset()
    getCredentialsMock.mockReset()
    queryOneMock.mockReset()
    recordPaymentMock.mockClear()
  })

  it("short-circuits when the carrier hasn't connected QBO", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    await expect(runQboSync(CARRIER)).resolves.toEqual({ connected: false })
    expect(recordPaymentMock).not.toHaveBeenCalled()
  })

  it("records a payment against the matching invoice and dedupes on replay", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      {
        ok: true,
        json: async () => ({
          QueryResponse: {
            Payment: [{ Id: "A", TotalAmt: 40, TxnDate: "2026-06-01", Line: [{ LinkedTxn: [{ TxnId: "87", TxnType: "Invoice" }] }] }],
          },
        }),
      },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "87", DocNumber: "INV-9" }] } }) }
    )
    queryOneMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.invoices")) return { id: "invoice-1" }
      if (sql.includes("FROM hub.payments")) return null
      return null
    })
    const result = await runQboSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 1, skipped: 0, unmatched: [] })
    expect(recordPaymentMock).toHaveBeenCalledWith(
      CARRIER,
      "invoice-1",
      { amountCents: 4000, paidOn: "2026-06-01", method: null, reference: "qbo:A" },
      { id: "system:qbo", name: "QuickBooks Online sync" }
    )
  })

  it("skips a payment already recorded under the same qbo: reference", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      {
        ok: true,
        json: async () => ({
          QueryResponse: {
            Payment: [{ Id: "A", TotalAmt: 40, TxnDate: "2026-06-01", Line: [{ LinkedTxn: [{ TxnId: "87", TxnType: "Invoice" }] }] }],
          },
        }),
      },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "87", DocNumber: "INV-9" }] } }) }
    )
    queryOneMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.invoices")) return { id: "invoice-1" }
      if (sql.includes("FROM hub.payments")) return { id: "payment-1" }
      return null
    })
    const result = await runQboSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 0, skipped: 1, unmatched: [] })
    expect(recordPaymentMock).not.toHaveBeenCalled()
  })

  it("reports unmatched invoice numbers instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      {
        ok: true,
        json: async () => ({
          QueryResponse: {
            Payment: [{ Id: "A", TotalAmt: 40, TxnDate: "2026-06-01", Line: [{ LinkedTxn: [{ TxnId: "87", TxnType: "Invoice" }] }] }],
          },
        }),
      },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "87", DocNumber: "INV-404" }] } }) }
    )
    queryOneMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.invoices")) return null
      return null
    })
    const result = await runQboSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 0, skipped: 0, unmatched: ["INV-404"] })
    expect(recordPaymentMock).not.toHaveBeenCalled()
  })
})

describe("pushInvoiceToQbo", () => {
  const INVOICE = {
    id: "invoice-1", number: "INV-1042", amount_cents: 125050, customer_name: "Acme Foods", sent_log: [],
  }

  beforeEach(() => {
    hasCredentialsMock.mockReset()
    getCredentialsMock.mockReset()
    getInvoiceMock.mockReset()
    queryMock.mockReset().mockResolvedValue([])
    logAuditMock.mockReset()
  })

  it("reports not connected without credentials, no fetch attempted", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    const result = await pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: false })
    expect(getInvoiceMock).not.toHaveBeenCalled()
  })

  it("short-circuits on a second push instead of double-creating the QBO invoice", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue({ ...INVOICE, sent_log: [{ to: "qbo", at: "2026-06-01", kind: "qbo-push" }] } as never)
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const result = await pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: true, alreadyPushed: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("resolves customer/item by name (creating a customer that doesn't exist yet) and creates the QBO invoice", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue(INVOICE as never)
    const fetchMock = mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: {} }) }, // Customer lookup: no match
      { ok: true, json: async () => ({ Customer: { Id: "501" } }) }, // Customer create
      { ok: true, json: async () => ({ QueryResponse: { Item: [{ Id: "77" }] } }) }, // Item lookup: match
      { ok: true, json: async () => ({ Invoice: { Id: "900" } }) } // Invoice create
    )
    const result = await pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: true, pushed: true })

    const [invoiceUrl, invoiceInit] = fetchMock.mock.calls[4] as [string, RequestInit]
    expect(invoiceUrl).toMatch(/\/invoice\?minorversion=65$/)
    const body = JSON.parse(invoiceInit.body as string)
    expect(body).toEqual({
      DocNumber: "INV-1042",
      CustomerRef: { value: "501" },
      Line: [{ Amount: 1250.5, DetailType: "SalesItemLineDetail", SalesItemLineDetail: { ItemRef: { value: "77" } } }],
    })
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.invoices SET sent_log"), expect.any(Array))
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({ action: "qbo-push" }))
  })

  it("surfaces a non-OK invoice-create response as an error rather than marking it pushed", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue(INVOICE as never)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: { Customer: [{ Id: "501" }] } }) },
      { ok: true, json: async () => ({ QueryResponse: { Item: [{ Id: "77" }] } }) },
      { ok: false, status: 500, json: async () => ({}) }
    )
    await expect(pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)).rejects.toThrow(/500/)
    expect(queryMock).not.toHaveBeenCalled()
  })
})
