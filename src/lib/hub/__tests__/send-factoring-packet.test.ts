/**
 * sendFactoringPacket (TEST_GAPS.md #13) — the email that gets an invoice
 * funded. Pins the documented contract (invoice + rate confirmation + POD,
 * NOT the BOL — the function's own doc comment says "invoice + rate con +
 * POD"): a missing attachment throws instead of shipping an incomplete
 * packet silently, and a missing factoring-company email is refused before
 * any read/send work happens.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, queryOneMock, sendMail, logAudit, readStoredFileBytes, listDocuments } = vi.hoisted(() => ({
  queryMock: vi.fn(async () => []),
  queryOneMock: vi.fn(),
  sendMail: vi.fn(async () => undefined),
  logAudit: vi.fn(async () => undefined),
  readStoredFileBytes: vi.fn(),
  listDocuments: vi.fn(async () => []),
}))

vi.mock("../db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
}))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ id: "carrier-1", name: "Thind Transport" })),
  getCarrierSettings: vi.fn(async () => ({
    factoring: { email: "ops@factorco.test" },
  })),
}))
vi.mock("../documents", () => ({
  readStoredFileBytes,
  listDocuments,
  storeGeneratedPdf: vi.fn(),
}))
vi.mock("../audit", () => ({ logAudit }))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => true),
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn(() => "billing@test"),
}))

import { sendFactoringPacket } from "../invoices"

const INVOICE = {
  id: "inv-1", carrier_id: "carrier-1", number: "THD-INV-1001",
  customer_name: "Cascade Produce Co.", load_reference: "THD-1001", load_id: "load-1",
  pdf_url: "/generated/THD-INV-1001.pdf", amount_cents: 240000,
}

const DOCS = [
  { id: "doc-1", kind: "rate_confirmation", url: "/uploads/ratecon.pdf", storage: "local", file_name: "ratecon.pdf" },
  { id: "doc-2", kind: "pod", url: "/uploads/pod.pdf", storage: "local", file_name: "pod.pdf" },
  { id: "doc-3", kind: "bol", url: "/uploads/bol.pdf", storage: "local", file_name: "bol.pdf" },
]

describe("sendFactoringPacket", () => {
  beforeEach(() => {
    queryMock.mockClear()
    sendMail.mockClear()
    logAudit.mockClear()
    readStoredFileBytes.mockReset()
    readStoredFileBytes.mockImplementation(async (url: string) => Buffer.from(url))
    listDocuments.mockReset()
    listDocuments.mockResolvedValue(DOCS)
    queryOneMock.mockReset()
    queryOneMock.mockResolvedValue(INVOICE)
  })

  it("throws when the invoice does not exist for this carrier", async () => {
    queryOneMock.mockResolvedValue(null)
    await expect(
      sendFactoringPacket("carrier-1", "missing", { id: "u1", name: "Office" })
    ).rejects.toThrow(/invoice not found/i)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("refuses to send without a factoring-company email on file", async () => {
    const { getCarrierSettings } = await import("../settings")
    vi.mocked(getCarrierSettings).mockResolvedValueOnce({ factoring: { email: null } } as never)
    await expect(
      sendFactoringPacket("carrier-1", "inv-1", { id: "u1", name: "Office" })
    ).rejects.toThrow(/no factoring company email/i)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("emails the invoice PDF + rate confirmation + POD to the factor, excluding the BOL", async () => {
    const result = await sendFactoringPacket("carrier-1", "inv-1", { id: "u1", name: "Office" })

    expect(result).toEqual({ to: "ops@factorco.test" })
    expect(sendMail).toHaveBeenCalledTimes(1)
    const call = sendMail.mock.calls[0][0]
    expect(call.to).toBe("ops@factorco.test")
    expect(call.attachments).toHaveLength(3)
    const filenames = call.attachments.map((a: { filename: string }) => a.filename)
    expect(filenames).toEqual([
      "THD-INV-1001.pdf", "rate_confirmation-ratecon.pdf", "pod-pod.pdf",
    ])
    expect(filenames.some((f: string) => f.startsWith("bol-"))).toBe(false)
  })

  it("stamps sent_log and writes an audit entry scoped to this carrier", async () => {
    await sendFactoringPacket("carrier-1", "inv-1", { id: "u1", name: "Office" })

    const updateCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("UPDATE hub.invoices"))
    expect(updateCall).toBeDefined()
    const [, params] = updateCall!
    expect(params[0]).toBe("inv-1")
    expect(params[2]).toBe("carrier-1")
    const sentLog = JSON.parse(params[1] as string)
    expect(sentLog[0]).toMatchObject({ to: "ops@factorco.test", kind: "factoring-packet" })

    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      carrierId: "carrier-1", entityType: "invoice", entityId: "inv-1", action: "factoring-packet",
    }))
  })

  it("throws naming the missing document instead of sending an incomplete packet", async () => {
    readStoredFileBytes.mockImplementation(async (url: string) =>
      url === "/uploads/pod.pdf" ? null : Buffer.from(url)
    )

    await expect(
      sendFactoringPacket("carrier-1", "inv-1", { id: "u1", name: "Office" })
    ).rejects.toThrow(/pod-pod\.pdf/)
    expect(sendMail).not.toHaveBeenCalled()
    expect(queryMock.mock.calls.some(([sql]) => String(sql).includes("UPDATE hub.invoices"))).toBe(false)
  })
})
