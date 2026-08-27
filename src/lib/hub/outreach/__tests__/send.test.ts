import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Prospect } from "../prospects"

const { mailShouldSend, sendMail } = vi.hoisted(() => ({
  mailShouldSend: vi.fn(async () => false),
  sendMail: vi.fn(async () => ({})),
}))

vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => false),
  mailShouldSend,
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn((name: string) => `"${name}" <noreply@example.com>`),
}))

import { sendOutreachEmail } from "../send"

function prospect(over: Partial<Prospect> = {}): Prospect {
  return {
    id: "1", audience: "broker", company: "ACME", contact_name: "Jane",
    email: "jane@acme.com", phone: null, mc_number: null, lane: null,
    equipment: null, notes: null, source: "csv", status: "approved",
    draft_channel: "email", draft_subject: "Hello", draft_body: "Body\n\nunsubscribe with STOP",
    last_contacted_at: null, created_at: new Date().toISOString(),
    ...over,
  }
}

describe("sendOutreachEmail — guardrails", () => {
  beforeEach(() => {
    mailShouldSend.mockReset()
    mailShouldSend.mockResolvedValue(false)
    sendMail.mockReset()
    sendMail.mockResolvedValue({})
  })

  it("refuses a suppressed (unsubscribed) prospect", async () => {
    const r = await sendOutreachEmail(prospect({ status: "unsubscribed" }), "Thind Transport")
    expect(r.sent).toBe(false)
    expect(r.reason).toMatch(/opted out|bounced|suppress/i)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("refuses a bounced prospect", async () => {
    const r = await sendOutreachEmail(prospect({ status: "bounced" }), "Thind Transport")
    expect(r.sent).toBe(false)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("refuses a prospect with no email", async () => {
    const r = await sendOutreachEmail(prospect({ email: null }), "Thind Transport")
    expect(r.sent).toBe(false)
    expect(r.reason).toMatch(/no email/i)
  })

  it("refuses when there is no reviewed draft", async () => {
    const r = await sendOutreachEmail(prospect({ draft_subject: null, draft_body: null }), "Thind Transport")
    expect(r.sent).toBe(false)
    expect(r.reason).toMatch(/draft/i)
  })

  it("refuses a non-email draft channel", async () => {
    const r = await sendOutreachEmail(prospect({ draft_channel: "sms" }), "Thind Transport")
    expect(r.sent).toBe(false)
  })

  it("stops with a clear reason when email is not configured", async () => {
    const r = await sendOutreachEmail(prospect(), "Thind Transport")
    expect(r.sent).toBe(false)
    expect(r.reason).toMatch(/configured/i)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("sends in simulation when SMTP is unset (outbox echo)", async () => {
    mailShouldSend.mockResolvedValue(true)
    const r = await sendOutreachEmail(prospect(), "Thind Transport")
    expect(r).toEqual({ sent: true })
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: "jane@acme.com",
      subject: "Hello",
    })
  })

  it("still suppresses even when simulation echo is on", async () => {
    mailShouldSend.mockResolvedValue(true)
    const r = await sendOutreachEmail(prospect({ status: "unsubscribed" }), "Thind Transport")
    expect(r.sent).toBe(false)
    expect(sendMail).not.toHaveBeenCalled()
  })
})
