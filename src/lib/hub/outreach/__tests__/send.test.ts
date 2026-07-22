import { describe, it, expect, beforeEach } from "vitest"
import { sendOutreachEmail } from "../send"
import type { Prospect } from "../prospects"

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
    // Force "email not configured" so we exercise guards without real SMTP.
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
    delete process.env.EMAIL_USER
    delete process.env.EMAIL_PASS
  })

  it("refuses a suppressed (unsubscribed) prospect", async () => {
    const r = await sendOutreachEmail(prospect({ status: "unsubscribed" }), "Thind Transport")
    expect(r.sent).toBe(false)
    expect(r.reason).toMatch(/opted out|bounced|suppress/i)
  })

  it("refuses a bounced prospect", async () => {
    const r = await sendOutreachEmail(prospect({ status: "bounced" }), "Thind Transport")
    expect(r.sent).toBe(false)
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
  })
})
