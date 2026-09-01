/**
 * Password reset used to skip sendMail on isEmailConfigured() — in
 * SIMULATION that hid the reset link. Same gate as invoices/packet: the
 * echo lands in hub.email_outbox so the flow is testable without SMTP.
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

vi.mock("@/lib/driver-db", () => ({
  findDriverByEmail: vi.fn(async () => ({ id: "drv-1", email: "driver@demo.thind" })),
  setResetToken: vi.fn(async () => {}),
}))

import { POST } from "../route"
import { findDriverByEmail, setResetToken } from "@/lib/driver-db"

const findMock = vi.mocked(findDriverByEmail)
const tokenMock = vi.mocked(setResetToken)

function request(email = "driver@demo.thind") {
  return new Request("http://localhost/api/driver/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  })
}

describe("POST /api/driver/forgot-password + mailShouldSend", () => {
  beforeEach(() => {
    mailShouldSend.mockReset()
    mailShouldSend.mockResolvedValue(false)
    sendMail.mockClear()
    findMock.mockReset()
    findMock.mockResolvedValue({ id: "drv-1", email: "driver@demo.thind" } as never)
    tokenMock.mockReset()
  })

  it("still returns enumeration-safe success without sending when mail cannot deliver", async () => {
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("echoes the reset mail in simulation without SMTP", async () => {
    mailShouldSend.mockResolvedValue(true)
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: "driver@demo.thind",
      subject: "Reset Your Thind Transport Password",
    })
    const html = String(sendMail.mock.calls[0][0].html)
    expect(html).toContain("/driver/reset-password?token=")
  })
})
