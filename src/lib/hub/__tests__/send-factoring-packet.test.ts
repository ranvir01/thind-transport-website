/**
 * sendFactoringPacket (TEST_GAPS.md #13) — the email that gets an invoice
 * funded. Pins two things the doc flagged as unverified: the packet actually
 * attaches invoice PDF + rate con + POD, and a missing document throws
 * (rejects) instead of silently sending an incomplete packet.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, queryOneMock, sendMail, readStoredFileBytesMock, logAuditMock } = vi.hoisted(() => ({
  queryMock: vi.fn(async () => []),
  queryOneMock: vi.fn(),
  sendMail: vi.fn(async () => undefined),
  readStoredFileBytesMock: vi.fn(async (url: string) => Buffer.from(`bytes:${url}`)),
  logAuditMock: vi.fn(async () => undefined),
}))

vi.mock("../db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
  hubDb: vi.fn(),
}))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ id: "carrier-1", name: "Thind Transport" })),
  getCarrierSettings: vi.fn(async () => ({
    factoring: { company: "Apex Capital", remitName: null, remitAddress: null, email: "ops@apexcapital.test" },
  })),
}))
vi.mock("../loads", () => ({
  getLoad: vi.fn(async () => null),
  getLoadStops: vi.fn(async () => []),
  changeLoadStatus: vi.fn(async () => undefined),
}))
vi.mock("../customers", () => ({ getCustomer: vi.fn(async () => null) }))
vi.mock("../documents", () => ({
  listDocuments: vi.fn(async () => [
    { id: "doc-1", kind: "rate_confirmation", file_name: "ratecon.pdf", url: "/files/ratecon.pdf", storage: "local" },
    { id: "doc-2", kind: "pod", file_name: "pod.pdf", url: "/files/pod.pdf", storage: "local" },
    { id: "doc-3", kind: "bol", file_name: "bol.pdf", url: "/files/bol.pdf", storage: "local" },
  ]),
  storeGeneratedPdf: vi.fn(async () => "/generated/x.pdf"),
  readStoredFileBytes: readStoredFileBytesMock,
}))
vi.mock("../pdf", () => ({
  buildInvoicePdf: vi.fn(async () => new Uint8Array([1])),
  buildStatementPdf: vi.fn(async () => new Uint8Array([2])),
}))
vi.mock("../audit", () => ({ logAudit: logAuditMock }))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => true),
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn(() => "billing@test"),
}))

import { sendFactoringPacket } from "../invoices"

const CARRIER = "carrier-1"
const ACTOR = { id: "u1", name: "Office" }

const INVOICE_ROW = {
  id: "inv-1", carrier_id: CARRIER, number: "THD-INV-1001", customer_id: "cust-1",
  load_id: "load-1", amount_cents: 300000, issued_on: "2026-06-01", due_on: "2026-07-01",
  status: "sent", factored: false, remit_to: null, pdf_url: "/generated/invoice-1001.pdf",
  sent_log: [], customer_name: "Cascade Produce Co.", load_reference: "THD-1001",
}

describe("sendFactoringPacket", () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue([])
    queryOneMock.mockReset().mockResolvedValue(INVOICE_ROW)
    sendMail.mockClear()
    readStoredFileBytesMock.mockClear()
    readStoredFileBytesMock.mockImplementation(async (url: string) => Buffer.from(`bytes:${url}`))
    logAuditMock.mockClear()
  })

  it("attaches the invoice PDF, rate confirmation, and POD, and emails the factor", async () => {
    const result = await sendFactoringPacket(CARRIER, "inv-1", ACTOR)

    expect(result).toEqual({ to: "ops@apexcapital.test" })
    expect(sendMail).toHaveBeenCalledTimes(1)
    const call = sendMail.mock.calls[0][0]
    expect(call.to).toBe("ops@apexcapital.test")
    expect(call.subject).toContain("THD-INV-1001")
    expect(call.attachments).toHaveLength(3)
    expect(call.attachments.map((a: { filename: string }) => a.filename)).toEqual([
      "THD-INV-1001.pdf", "rate_confirmation-ratecon.pdf", "pod-pod.pdf",
    ])

    const update = queryMock.mock.calls.find((c) => String(c[0]).includes("UPDATE hub.invoices SET sent_log"))
    expect(update).toBeDefined()
    const [invoiceId, sentLogJson, carrierId] = update![1] as [string, string, string]
    expect(invoiceId).toBe("inv-1")
    expect(carrierId).toBe(CARRIER)
    expect(JSON.parse(sentLogJson)).toEqual([
      { to: "ops@apexcapital.test", at: expect.any(String), kind: "factoring-packet" },
    ])

    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: CARRIER, entityType: "invoice", entityId: "inv-1", action: "factoring-packet" })
    )
  })

  it("rejects with a clear error and sends nothing when a required document can't be read", async () => {
    readStoredFileBytesMock.mockImplementation(async (url: string) =>
      url === "/files/pod.pdf" ? null : Buffer.from(`bytes:${url}`)
    )

    await expect(sendFactoringPacket(CARRIER, "inv-1", ACTOR)).rejects.toThrow(/pod-pod\.pdf/)

    expect(sendMail).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
    expect(queryMock.mock.calls.some((c) => String(c[0]).includes("UPDATE hub.invoices"))).toBe(false)
  })

  it("refuses when no factoring company email is configured", async () => {
    const { getCarrierSettings } = await import("../settings")
    vi.mocked(getCarrierSettings).mockResolvedValueOnce({
      factoring: { company: null, remitName: null, remitAddress: null, email: null },
    } as Awaited<ReturnType<typeof getCarrierSettings>>)

    await expect(sendFactoringPacket(CARRIER, "inv-1", ACTOR)).rejects.toThrow(/factoring company email/i)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("refuses when the invoice does not exist for this carrier", async () => {
    queryOneMock.mockResolvedValueOnce(null)
    await expect(sendFactoringPacket(CARRIER, "missing", ACTOR)).rejects.toThrow(/invoice not found/i)
  })
})
