/**
 * TEST_GAPS.md §2 item #13: sendFactoringPacket (invoices.ts:540) was 0%
 * covered — lines 493-529 in the original citation. The packet that gets an
 * invoice funded had nothing pinning that a missing rate con or POD is
 * caught BEFORE the email goes out (readStoredFileBytes returns null on a
 * dead blob/local path — see the note above attachDoc), that the packet is
 * addressed to settings.factoring.email, or that the read failure surfaces
 * as a thrown Error (which factoringPacketAction@money.ts:87 turns into
 * {ok:false}) rather than silently sending an incomplete packet.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, queryOneMock, sendMail, listDocumentsMock, readStoredFileBytesMock } = vi.hoisted(() => ({
  queryMock: vi.fn(async (_sql: string, _params?: unknown[]) => [] as unknown[]),
  queryOneMock: vi.fn(async (_sql: string, _params?: unknown[]) => null as unknown),
  sendMail: vi.fn(async (_message: Record<string, unknown>) => undefined),
  listDocumentsMock: vi.fn(async () => [] as unknown[]),
  readStoredFileBytesMock: vi.fn(async () => null as Buffer | null),
}))

vi.mock("../db", () => ({ query: queryMock, queryOne: queryOneMock, hubDb: vi.fn() }))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ id: "carrier-1", name: "Thind Transport" })),
  getCarrierSettings: vi.fn(async () => ({
    factoring: { email: "factor@example.com", remitName: null, remitAddress: null },
    branding: { accent: null },
  })),
  nextInvoiceNumber: vi.fn(async () => "THD-INV-1001"),
}))
vi.mock("../customers", () => ({ getCustomer: vi.fn(async () => null) }))
vi.mock("../loads", () => ({
  getLoad: vi.fn(async () => null),
  getLoadStops: vi.fn(async () => []),
  changeLoadStatus: vi.fn(async () => null),
}))
vi.mock("../documents", () => ({
  listDocuments: listDocumentsMock,
  storeGeneratedPdf: vi.fn(async () => "/x.pdf"),
  readStoredFileBytes: readStoredFileBytesMock,
}))
vi.mock("../pdf", () => ({ buildInvoicePdf: vi.fn(), buildStatementPdf: vi.fn() }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => true),
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn(() => "billing@thind.test"),
}))

import { logAudit } from "../audit"
import { sendFactoringPacket } from "../invoices"

const CARRIER = "carrier-1"
const ACTOR = { id: "actor-1", name: "Dispatch" }

const invoiceRow = {
  id: "inv-1", carrier_id: CARRIER, number: "THD-INV-1001", load_id: "load-1",
  load_reference: "THD-1042", customer_name: "Cascade Produce Co.", amount_cents: 244690,
  pdf_url: "/invoices/inv-1.pdf",
}

const rateConDoc = {
  id: "doc-rc", kind: "rate_confirmation", file_name: "ratecon.pdf", url: "/docs/ratecon.pdf", storage: "local",
}
const podDoc = {
  id: "doc-pod", kind: "pod", file_name: "pod.pdf", url: "/docs/pod.pdf", storage: "local",
}
const bolDoc = {
  id: "doc-bol", kind: "bol", file_name: "bol.pdf", url: "/docs/bol.pdf", storage: "local",
}

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([])
  queryOneMock.mockReset().mockImplementation(async (sql: string) => (sql.includes("hub.invoices") ? invoiceRow : null))
  sendMail.mockClear()
  listDocumentsMock.mockReset().mockResolvedValue([rateConDoc, podDoc])
  readStoredFileBytesMock.mockReset().mockResolvedValue(Buffer.from("bytes"))
  vi.mocked(logAudit).mockClear()
})

describe("sendFactoringPacket (TEST_GAPS.md #13)", () => {
  it("throws before sending mail when the invoice PDF can't be read — no incomplete packet goes out", async () => {
    readStoredFileBytesMock.mockImplementation(async (url: string) => (url === invoiceRow.pdf_url ? null : Buffer.from("x")))

    await expect(sendFactoringPacket(CARRIER, "inv-1", ACTOR)).rejects.toThrow(/THD-INV-1001\.pdf/)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("throws before sending mail when the POD can't be read, naming the missing file", async () => {
    readStoredFileBytesMock.mockImplementation(async (url: string) => (url === podDoc.url ? null : Buffer.from("x")))

    await expect(sendFactoringPacket(CARRIER, "inv-1", ACTOR)).rejects.toThrow(/pod-pod\.pdf/)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("throws when no factoring email is configured, before touching documents or mail", async () => {
    const { getCarrierSettings } = await import("../settings")
    vi.mocked(getCarrierSettings).mockResolvedValueOnce({
      factoring: { email: null, remitName: null, remitAddress: null },
      branding: { accent: null },
    } as never)

    await expect(sendFactoringPacket(CARRIER, "inv-1", ACTOR)).rejects.toThrow(
      "No factoring company email configured in settings"
    )
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("happy path: attaches invoice PDF + rate con + POD, addresses the factor's email, and skips unrelated doc kinds", async () => {
    listDocumentsMock.mockResolvedValue([rateConDoc, podDoc, bolDoc])

    const result = await sendFactoringPacket(CARRIER, "inv-1", ACTOR)

    expect(result).toEqual({ to: "factor@example.com" })
    expect(sendMail).toHaveBeenCalledTimes(1)
    const message = sendMail.mock.calls[0][0] as { to: string; attachments: { filename: string }[] }
    expect(message.to).toBe("factor@example.com")
    const filenames = message.attachments.map((a) => a.filename)
    expect(filenames).toEqual(["THD-INV-1001.pdf", "rate_confirmation-ratecon.pdf", "pod-pod.pdf"])
    expect(filenames).not.toContain("bol-bol.pdf")
  })

  it("stamps sent_log with kind 'factoring-packet' scoped to the invoice and carrier", async () => {
    await sendFactoringPacket(CARRIER, "inv-1", ACTOR)

    const sentLogUpdate = queryMock.mock.calls.find(([sql]) => String(sql).includes("SET sent_log"))!
    const [sql, params] = sentLogUpdate as [string, unknown[]]
    expect(String(sql)).toContain("WHERE id = $1 AND carrier_id = $3")
    expect(params[0]).toBe("inv-1")
    expect(params[2]).toBe(CARRIER)
    const logged = JSON.parse(params[1] as string)
    expect(logged[0]).toMatchObject({ to: "factor@example.com", kind: "factoring-packet" })
  })

  it("audits the send with the invoice as the entity and the factor email as the new value", async () => {
    await sendFactoringPacket(CARRIER, "inv-1", ACTOR)

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierId: CARRIER, actorId: ACTOR.id, actorName: ACTOR.name,
        entityType: "invoice", entityId: "inv-1", action: "factoring-packet",
        newValue: { to: "factor@example.com" },
      })
    )
  })
})
