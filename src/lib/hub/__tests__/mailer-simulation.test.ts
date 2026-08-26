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
import { createMailTransport } from "@/lib/mailer"

const queryMock = vi.mocked(query)
const ORIGINAL = process.env.HAULDESK_MODE

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.HAULDESK_MODE
  else process.env.HAULDESK_MODE = ORIGINAL
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
})
