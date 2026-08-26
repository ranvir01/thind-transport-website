/**
 * Regression for emailPacket() silently attempting a real SMTP send (and
 * eating the 8s connectionTimeout) when SMTP isn't configured — every other
 * mail-sending path in the codebase (invoices.ts, settlements.ts, the public
 * form actions) checks isEmailConfigured() first; packet.ts didn't.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { isEmailConfigured, sendMail } = vi.hoisted(() => ({
  isEmailConfigured: vi.fn(),
  sendMail: vi.fn(async () => ({})),
}))

vi.mock("@/lib/mailer", () => ({
  isEmailConfigured,
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn((name: string) => `"${name}" <noreply@example.com>`),
}))

vi.mock("../db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ name: "Thind Transport", dot_number: "123", mc_number: "456", phone: null })),
}))

vi.mock("fs", () => ({
  promises: { readFile: vi.fn(async () => Buffer.from("pdf-bytes")) },
}))

import { query } from "../db"
import { emailPacket } from "../packet"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const doc = (kind: string) => ({
  id: `doc-${kind}`,
  entity_type: "carrier" as const,
  entity_id: CARRIER,
  kind,
  file_name: `${kind}.pdf`,
  mime_type: "application/pdf",
  size_bytes: 100,
  storage: "local" as const,
  url: `/api/hub/files/${kind}.pdf`,
  expiry: null,
  uploaded_by: null,
  created_at: new Date().toISOString(),
})

beforeEach(() => {
  queryMock.mockReset()
  queryMock.mockResolvedValue([doc("w9"), doc("insurance"), doc("authority_letter")])
  isEmailConfigured.mockReset()
  sendMail.mockClear()
})

describe("emailPacket + isEmailConfigured", () => {
  it("fails fast with reason 'not_configured' instead of attempting a real send", async () => {
    isEmailConfigured.mockReturnValue(false)
    const result = await emailPacket(CARRIER, "broker@example.com", null)
    // attached reflects the 3 documents actually read before the SMTP check, not 0 —
    // a caller trusting `attached` on a non-sent response must see the true count.
    expect(result).toEqual({ sent: false, attached: 3, missing: [], reason: "not_configured" })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("sends normally once SMTP is configured and documents are attached", async () => {
    isEmailConfigured.mockReturnValue(true)
    const result = await emailPacket(CARRIER, "broker@example.com", null)
    expect(result.sent).toBe(true)
    expect(result.attached).toBe(3)
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it("reports 'missing_docs' (not 'not_configured') when no attachments exist, even if SMTP is unset", async () => {
    queryMock.mockResolvedValue([])
    isEmailConfigured.mockReturnValue(false)
    const result = await emailPacket(CARRIER, "broker@example.com", null)
    expect(result.reason).toBe("missing_docs")
    expect(sendMail).not.toHaveBeenCalled()
  })
})
