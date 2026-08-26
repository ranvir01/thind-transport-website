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
import { normalizeQboPayment, pushInvoiceToQbo, qboSource, qboTokenExpiryNotice, runQboSync } from "../integrations/qbo"

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

  it("tolerates a payment with no Line array and no Id instead of crashing", () => {
    const row = normalizeQboPayment({ TotalAmt: 5 }, new Map([["87", "INV-9"]]))
    expect(row.external_id).toBe("")
    expect(row.invoiceNumber).toBeNull()
    expect(row.amountCents).toBe(500)
  })

  it("ignores lines without a LinkedTxn array and TxnIds absent from the map", () => {
    const row = normalizeQboPayment(
      { Id: "2", TotalAmt: 10, Line: [{ Amount: 10 }, { LinkedTxn: [{ TxnId: "99", TxnType: "Invoice" }] }] },
      new Map([["87", "INV-9"]])
    )
    expect(row.invoiceNumber).toBeNull()
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
    const fetchMock = mockFetchSequence(
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
    // Minor versions below 75 have been ignored (served as v75) since 2025-08-01 —
    // the pin must say what actually happens.
    expect((fetchMock.mock.calls[1] as [string])[0]).toMatch(/&minorversion=75$/)
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

  it("refuses to pull on a partial/corrupted credential row even though hasCredentials is true", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ clientId: "cid", clientSecret: "csec", refreshToken: "rtok" })
    await expect(qboSource(CARRIER).pull()).rejects.toThrow(/not connected/)
  })

  it("surfaces an OK token response missing access_token as an error rather than proceeding with undefined", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence({ ok: true, json: async () => ({}) })
    await expect(qboSource(CARRIER).pull()).rejects.toThrow(/missing access_token/)
  })

  it("persists a rotated refresh token so the next sync doesn't redeem a stale one", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok", refresh_token: "rtok-new" }) },
      { ok: true, json: async () => ({ QueryResponse: { Payment: [] } }) }
    )
    await qboSource(CARRIER).pull()
    // createdBy must be null for system rotation — created_by is a UUID column,
    // and the old "system:qbo" sentinel crashed the INSERT on every rotation.
    expect(saveCredentialsMock).toHaveBeenCalledWith(
      CARRIER,
      "qbo",
      { ...CREDS, refreshToken: "rtok-new" },
      null
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

  it("persists the refresh token's own expiry (x_refresh_token_expires_in) alongside a rotation", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-19T00:00:00Z"), toFake: ["Date"] })
    try {
      hasCredentialsMock.mockResolvedValue(true)
      getCredentialsMock.mockResolvedValue(CREDS)
      mockFetchSequence(
        // 5 years in seconds — Intuit's hard cap
        { ok: true, json: async () => ({ access_token: "tok", refresh_token: "rtok-new", x_refresh_token_expires_in: 157680000 }) },
        { ok: true, json: async () => ({ QueryResponse: { Payment: [] } }) }
      )
      await qboSource(CARRIER).pull()
      expect(saveCredentialsMock).toHaveBeenCalledWith(
        CARRIER,
        "qbo",
        { ...CREDS, refreshToken: "rtok-new", refreshTokenExpiresAt: "2031-07-18T00:00:00.000Z" },
        null
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("writes a first-seen expiry even when the refresh token itself didn't rotate", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-19T00:00:00Z"), toFake: ["Date"] })
    try {
      hasCredentialsMock.mockResolvedValue(true)
      getCredentialsMock.mockResolvedValue(CREDS)
      mockFetchSequence(
        { ok: true, json: async () => ({ access_token: "tok", refresh_token: CREDS.refreshToken, x_refresh_token_expires_in: 157680000 }) },
        { ok: true, json: async () => ({ QueryResponse: { Payment: [] } }) }
      )
      await qboSource(CARRIER).pull()
      expect(saveCredentialsMock).toHaveBeenCalledWith(
        CARRIER,
        "qbo",
        { ...CREDS, refreshTokenExpiresAt: "2031-07-18T00:00:00.000Z" },
        null
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not rewrite credentials every sync when the expiry only drifted within a day", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-19T06:00:00Z"), toFake: ["Date"] })
    try {
      hasCredentialsMock.mockResolvedValue(true)
      // Stored six hours ago by the previous sync — recomputed expiry lands 6h later.
      getCredentialsMock.mockResolvedValue({ ...CREDS, refreshTokenExpiresAt: "2031-07-18T00:00:00.000Z" })
      mockFetchSequence(
        { ok: true, json: async () => ({ access_token: "tok", refresh_token: CREDS.refreshToken, x_refresh_token_expires_in: 157680000 }) },
        { ok: true, json: async () => ({ QueryResponse: { Payment: [] } }) }
      )
      await qboSource(CARRIER).pull()
      expect(saveCredentialsMock).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it("keeps the stored expiry on rotation when the token response omits the field", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    const stored = { ...CREDS, refreshTokenExpiresAt: "2031-07-18T00:00:00.000Z" }
    getCredentialsMock.mockResolvedValue(stored)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok", refresh_token: "rtok-new" }) },
      { ok: true, json: async () => ({ QueryResponse: { Payment: [] } }) }
    )
    await qboSource(CARRIER).pull()
    expect(saveCredentialsMock).toHaveBeenCalledWith(
      CARRIER,
      "qbo",
      { ...stored, refreshToken: "rtok-new" },
      null
    )
  })

  it("surfaces a non-OK Payment query as an error rather than returning an empty pull", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: false, status: 500, json: async () => ({}) }
    )
    await expect(qboSource(CARRIER).pull()).rejects.toThrow(/Payment query → HTTP 500/)
  })

  it("skips malformed payments/lines when collecting linked ids and tolerates an invoice row missing DocNumber", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      {
        ok: true,
        json: async () => ({
          QueryResponse: {
            Payment: [
              { Id: "A", TotalAmt: 10 }, // no Line at all
              { Id: "B", TotalAmt: 20, Line: [{ Amount: 20 }, { LinkedTxn: [{ TxnId: "87", TxnType: "Invoice" }] }] },
            ],
          },
        }),
      },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "87" }] } }) } // DocNumber missing upstream
    )
    const rows = await qboSource(CARRIER).pull()
    expect(rows.map((r) => r.invoiceNumber)).toEqual([null, null])
  })
})

describe("qboTokenExpiryNotice (pure — settings-card copy for Intuit's 5-year refresh-token cap)", () => {
  const NOW = new Date("2026-07-19T00:00:00Z")

  it("returns null when disconnected or no expiry has been observed yet", () => {
    expect(qboTokenExpiryNotice(null, NOW)).toBeNull()
    expect(qboTokenExpiryNotice({ refreshToken: "rtok" }, NOW)).toBeNull()
    expect(qboTokenExpiryNotice({ refreshTokenExpiresAt: "not-a-date" }, NOW)).toBeNull()
  })

  it("shows a calm validity line when the expiry is far out", () => {
    const notice = qboTokenExpiryNotice({ refreshTokenExpiresAt: "2031-07-18T00:00:00.000Z" }, NOW)
    expect(notice).toEqual({ text: expect.stringContaining("valid until Jul"), warn: false })
    expect(notice?.text).toContain("2031")
  })

  it("warns inside 90 days so the owner can re-auth before the sync dies", () => {
    const notice = qboTokenExpiryNotice({ refreshTokenExpiresAt: "2026-09-01T00:00:00.000Z" }, NOW)
    expect(notice?.warn).toBe(true)
    expect(notice?.text).toMatch(/expires .*2026.*before then or the sync stops/)
  })

  it("says expired — reconnect once the hard death already happened", () => {
    const notice = qboTokenExpiryNotice({ refreshTokenExpiresAt: "2026-07-01T00:00:00.000Z" }, NOW)
    expect(notice?.warn).toBe(true)
    expect(notice?.text).toMatch(/expired .*restart the sync/)
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
    // Actor id must be null (UUID column) — a "system:qbo" sentinel made the
    // load-paid cascade throw after money moved. See factor.test.ts regression.
    expect(recordPaymentMock).toHaveBeenCalledWith(
      CARRIER,
      "invoice-1",
      { amountCents: 4000, paidOn: "2026-06-01", method: null, reference: "qbo:A" },
      { id: null, name: "QuickBooks Online sync" }
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

  it("refuses a zero-amount payment (missing/garbled TotalAmt) instead of recording $0.00", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      {
        ok: true,
        json: async () => ({
          QueryResponse: {
            // No TotalAmt at all — dollarsToCents normalizes this to 0 cents.
            Payment: [{ Id: "A", TxnDate: "2026-06-01", Line: [{ LinkedTxn: [{ TxnId: "87", TxnType: "Invoice" }] }] }],
          },
        }),
      },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "87", DocNumber: "INV-9" }] } }) }
    )
    const result = await runQboSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 0, skipped: 0, unmatched: ["INV-9"] })
    // Refused before any DB lookup — no invoice match, no dedup probe, no insert.
    expect(queryOneMock).not.toHaveBeenCalled()
    expect(recordPaymentMock).not.toHaveBeenCalled()
  })

  it("refuses a negative-amount payment (refund shape) instead of downgrading a paid invoice", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      {
        ok: true,
        json: async () => ({
          QueryResponse: {
            Payment: [{ Id: "A", TotalAmt: -25, TxnDate: "2026-06-01", Line: [{ LinkedTxn: [{ TxnId: "87", TxnType: "Invoice" }] }] }],
          },
        }),
      },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "87", DocNumber: "INV-9" }] } }) }
    )
    const result = await runQboSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 0, skipped: 0, unmatched: ["INV-9"] })
    expect(recordPaymentMock).not.toHaveBeenCalled()
  })

  it("drops payments without an Id and reports unlinked ones as unmatched by their QBO id", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      {
        ok: true,
        json: async () => ({
          QueryResponse: {
            Payment: [
              { TotalAmt: 5 }, // no Id — nothing to dedup on, skip entirely
              { Id: "B", TotalAmt: 7, Line: [] }, // no linked invoice — report, don't guess
            ],
          },
        }),
      }
    )
    const result = await runQboSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 0, skipped: 0, unmatched: ["B"] })
    expect(queryOneMock).not.toHaveBeenCalled()
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

  it("reports not connected on a partial/corrupted credential row even though hasCredentials is true", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ clientId: "cid", clientSecret: "csec", refreshToken: "rtok" })
    const result = await pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: false })
    expect(getInvoiceMock).not.toHaveBeenCalled()
  })

  it("throws instead of pushing when the invoice doesn't exist (deleted since page load)", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue(null)
    await expect(pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)).rejects.toThrow(/Invoice not found/)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("treats an unchanged amount as already pushed — no update sent", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue({ ...INVOICE, sent_log: [{ to: "qbo", at: "2026-06-01", kind: "qbo-push" }] } as never)
    const fetchMock = mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "900", SyncToken: "1", TotalAmt: 1250.5 }] } }) }
    )
    const result = await pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: true, alreadyPushed: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("sends a sparse update when the amount changed since the original push (rate/accessorial edit)", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue({
      ...INVOICE, amount_cents: 150000, sent_log: [{ to: "qbo", at: "2026-06-01", kind: "qbo-push" }],
    } as never)
    const fetchMock = mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "900", SyncToken: "1", TotalAmt: 1250.5 }] } }) },
      { ok: true, json: async () => ({ QueryResponse: { Item: [{ Id: "77" }] } }) },
      { ok: true, json: async () => ({ Invoice: { Id: "900" } }) }
    )
    const result = await pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: true, pushed: true, updated: true })

    const [updateUrl, updateInit] = fetchMock.mock.calls[3] as [string, RequestInit]
    expect(updateUrl).toMatch(/\/invoice\?operation=update&minorversion=75$/)
    const body = JSON.parse(updateInit.body as string)
    expect(body).toEqual({
      Id: "900",
      SyncToken: "1",
      sparse: true,
      Line: [{ Amount: 1500, DetailType: "SalesItemLineDetail", SalesItemLineDetail: { ItemRef: { value: "77" } } }],
    })
    // A number, not a string: QBO's Line[].Amount is typed Decimal in
    // Intuit's schema (contrast factor.ts's string `amount`, see factor.test.ts).
    expect(typeof body.Line[0].Amount).toBe("number")
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.invoices SET sent_log"), expect.any(Array))
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({ action: "qbo-push-update" }))
  })

  it("treats a missing QBO invoice (deleted upstream) as already pushed rather than guessing", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue({ ...INVOICE, sent_log: [{ to: "qbo", at: "2026-06-01", kind: "qbo-push" }] } as never)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: {} }) }
    )
    const result = await pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: true, alreadyPushed: true })
    expect(queryMock).not.toHaveBeenCalled()
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
    expect(invoiceUrl).toMatch(/\/invoice\?minorversion=75$/)
    const body = JSON.parse(invoiceInit.body as string)
    expect(body).toEqual({
      DocNumber: "INV-1042",
      CustomerRef: { value: "501" },
      Line: [{ Amount: 1250.5, DetailType: "SalesItemLineDetail", SalesItemLineDetail: { ItemRef: { value: "77" } } }],
    })
    // A number, not a string: QBO's Line[].Amount is typed Decimal in
    // Intuit's schema (contrast factor.ts's string `amount`, see factor.test.ts).
    expect(typeof body.Line[0].Amount).toBe("number")
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.invoices SET sent_log"), expect.any(Array))
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({ action: "qbo-push" }))
  })

  it("recognizes a prior sparse update in sent_log and defaults a missing SyncToken to \"0\"", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue({
      ...INVOICE, amount_cents: 150000, sent_log: [{ to: "qbo", at: "2026-06-01", kind: "qbo-push-update" }],
    } as never)
    const fetchMock = mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "900", TotalAmt: 1250.5 }] } }) }, // no SyncToken
      { ok: true, json: async () => ({ QueryResponse: { Item: [{ Id: "77" }] } }) },
      { ok: true, json: async () => ({ Invoice: { Id: "900" } }) }
    )
    const result = await pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: true, pushed: true, updated: true })
    const body = JSON.parse((fetchMock.mock.calls[3] as [string, RequestInit])[1].body as string)
    expect(body.SyncToken).toBe("0")
  })

  it("surfaces a non-OK sparse-update response as an error rather than logging a push", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue({
      ...INVOICE, amount_cents: 150000, sent_log: [{ to: "qbo", at: "2026-06-01", kind: "qbo-push" }],
    } as never)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: { Invoice: [{ Id: "900", SyncToken: "1", TotalAmt: 1250.5 }] } }) },
      { ok: true, json: async () => ({ QueryResponse: { Item: [{ Id: "77" }] } }) },
      { ok: false, status: 502, json: async () => ({}) }
    )
    await expect(pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)).rejects.toThrow(/invoice update → HTTP 502/)
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("surfaces a non-OK entity create as an error rather than pushing with a bogus ref", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue(INVOICE as never)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: {} }) }, // Customer lookup: no match
      { ok: false, status: 500, json: async () => ({}) } // Customer create fails
    )
    await expect(pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)).rejects.toThrow(/Customer create → HTTP 500/)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("surfaces an OK create response missing an Id instead of proceeding with undefined", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue(INVOICE as never)
    mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: {} }) }, // Customer lookup: no match
      { ok: true, json: async () => ({}) } // Customer create: OK but empty body
    )
    await expect(pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)).rejects.toThrow(/Customer create response missing Id/)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("falls back to 'Unknown customer' when the invoice has no customer name", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    getInvoiceMock.mockResolvedValue({ ...INVOICE, customer_name: null } as never)
    const fetchMock = mockFetchSequence(
      { ok: true, json: async () => ({ access_token: "tok" }) },
      { ok: true, json: async () => ({ QueryResponse: {} }) }, // Customer lookup: no match
      { ok: true, json: async () => ({ Customer: { Id: "501" } }) },
      { ok: true, json: async () => ({ QueryResponse: { Item: [{ Id: "77" }] } }) },
      { ok: true, json: async () => ({ Invoice: { Id: "900" } }) }
    )
    const result = await pushInvoiceToQbo(CARRIER, "invoice-1", ACTOR)
    expect(result).toEqual({ connected: true, pushed: true })
    const lookupUrl = (fetchMock.mock.calls[1] as [string])[0]
    expect(decodeURIComponent(lookupUrl)).toContain("DisplayName = 'Unknown customer'")
    const createBody = JSON.parse((fetchMock.mock.calls[2] as [string, RequestInit])[1].body as string)
    expect(createBody).toEqual({ DisplayName: "Unknown customer" })
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
