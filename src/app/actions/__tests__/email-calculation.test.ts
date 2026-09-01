/**
 * The earnings calculator used to fail closed on isEmailConfigured() — in
 * SIMULATION that skipped the outbox echo and told the driver to call.
 * Same gate as invoices/packet: mailShouldSend().
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
  mailFrom: vi.fn((name?: string) => `"${name ?? "Thind Transport Website"}" <noreply@example.com>`),
}))

import { emailCalculation } from "../email-calculation"
import { COMPANY_INFO } from "@/lib/constants"

const payload = {
  email: "oo@example.com",
  equipment: "Sleeper",
  miles: 2500,
  lineHaulRate: 2.1,
  fuelPrice: 3.8,
  weeklyGross: 5000,
  weeklyNet: 3200,
  weeklyDifference: 800,
  annualNet: 153600,
}

describe("emailCalculation + mailShouldSend", () => {
  beforeEach(() => {
    mailShouldSend.mockReset()
    mailShouldSend.mockResolvedValue(false)
    sendMail.mockClear()
  })

  it("fails with a call-us message when neither SMTP nor simulation can deliver", async () => {
    const result = await emailCalculation(payload)
    expect(result.success).toBe(false)
    expect(result.message).toContain("Call")
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("sends the driver estimate and a recruiting copy in simulation without SMTP", async () => {
    mailShouldSend.mockResolvedValue(true)
    const result = await emailCalculation(payload)
    expect(result.success).toBe(true)
    expect(sendMail).toHaveBeenCalledTimes(2)
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: "oo@example.com",
      subject: `Your earnings estimate — ${COMPANY_INFO.name}`,
    })
    expect(sendMail.mock.calls[1][0]).toMatchObject({
      to: COMPANY_INFO.email,
      replyTo: "oo@example.com",
      subject: "Calculator lead — oo@example.com",
    })
  })
})
