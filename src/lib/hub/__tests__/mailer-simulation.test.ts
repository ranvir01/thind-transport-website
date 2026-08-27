/**
 * In SIMULATION, createMailTransport().sendMail writes hub.email_outbox and
 * never opens SMTP. Fail-closed: env=simulation is enough.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "@/lib/hub/db"
import { createMailTransport, mailShouldSend } from "@/lib/mailer"

const queryMock = vi.mocked(query)
const ORIGINAL = process.env.HAULDESK_MODE
const ORIGINAL_SMTP = {
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
}

function restoreEnv() {
  if (ORIGINAL === undefined) delete process.env.HAULDESK_MODE
  else process.env.HAULDESK_MODE = ORIGINAL
  for (const [key, value] of Object.entries(ORIGINAL_SMTP)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(() => {
  restoreEnv()
  queryMock.mockReset()
})

describe("simulation mail echo", () => {
  it("inserts an outbox row instead of talking to SMTP", async () => {
    process.env.HAULDESK_MODE = "simulation"
    queryMock.mockResolvedValue([])
    const result = await createMailTransport().sendMail({
      to: "ap@broker.example",
      from: "ops@demo.thind",
      subject: "Invoice THD-INV-1008",
      text: "Please remit.",
      attachments: [{ filename: "THD-INV-1008.pdf" }],
    })
    expect(result.messageId).toMatch(/^sim-/)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("INSERT INTO hub.email_outbox")
    expect(params).toEqual(expect.arrayContaining([
      "ap@broker.example",
      "Invoice THD-INV-1008",
      "Please remit.",
    ]))
  })

  it("mailShouldSend is true in simulation without SMTP credentials", async () => {
    process.env.HAULDESK_MODE = "simulation"
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
    delete process.env.EMAIL_USER
    delete process.env.EMAIL_PASS
    expect(await mailShouldSend()).toBe(true)
  })

  it("mailShouldSend is false in legit without SMTP credentials", async () => {
    process.env.HAULDESK_MODE = "legit"
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
    delete process.env.EMAIL_USER
    delete process.env.EMAIL_PASS
    expect(await mailShouldSend()).toBe(false)
  })
})
