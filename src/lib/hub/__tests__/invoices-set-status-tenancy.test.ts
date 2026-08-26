/**
 * Regression: setInvoiceStatus discarded the UPDATE result, so a foreign or
 * missing invoice id still logged a success audit (status:disputed / status:sent).
 * RETURNING id and skip the audit when 0 rows match — same guard as
 * markSettlementPaid / updateFacilityInfo.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(),
  getCarrierSettings: vi.fn(),
  nextInvoiceNumber: vi.fn(),
}))
vi.mock("../loads", () => ({
  getLoad: vi.fn(),
  getLoadStops: vi.fn(),
  changeLoadStatus: vi.fn(),
}))
vi.mock("../customers", () => ({ getCustomer: vi.fn() }))
vi.mock("../documents", () => ({
  listDocuments: vi.fn(),
  storeGeneratedPdf: vi.fn(),
  readStoredFileBytes: vi.fn(),
}))
vi.mock("../pdf", () => ({
  buildInvoicePdf: vi.fn(),
  buildStatementPdf: vi.fn(),
}))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => false),
  createMailTransport: vi.fn(),
  mailFrom: vi.fn(),
}))

import { query } from "../db"
import { logAudit } from "../audit"
import { setInvoiceStatus } from "../invoices"

const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const INVOICE = "22222222-2222-2222-2222-222222222222"
const ACTOR = { id: "33333333-3333-3333-3333-333333333333", name: "Accountant" }

describe("setInvoiceStatus — 0-row foreign id", () => {
  beforeEach(() => {
    queryMock.mockReset()
    logAuditMock.mockClear()
  })

  it("returns 0 and skips the audit log when the UPDATE matches no tenant row", async () => {
    queryMock.mockResolvedValueOnce([])

    const touched = await setInvoiceStatus(CARRIER, INVOICE, "disputed", ACTOR)

    expect(touched).toBe(0)
    expect(logAuditMock).not.toHaveBeenCalled()
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND id = $2")
    expect(String(sql)).toContain("RETURNING id")
    expect(params).toEqual([CARRIER, INVOICE, "disputed"])
  })

  it("logs the status audit when a carrier-scoped UPDATE matched a row", async () => {
    queryMock.mockResolvedValueOnce([{ id: INVOICE }])

    const touched = await setInvoiceStatus(CARRIER, INVOICE, "disputed", ACTOR)

    expect(touched).toBe(1)
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierId: CARRIER,
        actorId: ACTOR.id,
        entityType: "invoice",
        entityId: INVOICE,
        action: "status:disputed",
        newValue: { status: "disputed" },
      })
    )
  })
})
