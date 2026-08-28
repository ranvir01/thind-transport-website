/**
 * Meeting requests used to skip sendMail on isEmailConfigured() — in
 * SIMULATION that skipped the outbox echo. Same gate as invoices/packet.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mailShouldSend, sendMail } = vi.hoisted(() => ({
  mailShouldSend: vi.fn(async () => false),
  sendMail: vi.fn(async (_message: Record<string, unknown>) => ({})),
}))

vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => false),
  mailShouldSend,
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn((name?: string) => `"${name ?? "Thind Transport"}" <noreply@example.com>`),
}))

vi.mock("@/lib/public-form-guard", () => ({
  HONEYPOT_FIELD: "website",
  publicFormBlocked: vi.fn(async () => false),
}))

import { POST } from "../route"

const body = {
  name: "Alex Driver",
  email: "alex@example.com",
  phone: "2065551234",
  preferredDate: "2026-09-01",
  preferredTime: "10:00 AM",
  meetingType: "phone",
  notes: "Ask about 90% split",
}

function request(payload: Record<string, unknown> = body) {
  return new Request("http://localhost/api/schedule-meeting", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
}

describe("POST /api/schedule-meeting + mailShouldSend", () => {
  beforeEach(() => {
    mailShouldSend.mockReset()
    mailShouldSend.mockResolvedValue(false)
    sendMail.mockClear()
  })

  it("returns success without sending when neither SMTP nor simulation can deliver", async () => {
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("echoes owner + confirmation mail in simulation without SMTP", async () => {
    mailShouldSend.mockResolvedValue(true)
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(sendMail).toHaveBeenCalledTimes(2)
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: "thindcarrier@gmail.com",
      subject: "Meeting Request - Alex Driver",
    })
    expect(sendMail.mock.calls[1][0]).toMatchObject({
      to: "alex@example.com",
      subject: "Meeting Request Received - Thind Transport",
    })
  })
})
