/**
 * src/app/api/hub/webhooks/[provider]/route.ts had zero test coverage — the
 * only inbound push front door for integrations (factoring status today,
 * more providers later). Covers unknown provider/carrier, signature
 * rejection (+ its sync-log write, including when that write itself fails),
 * missing carrier param, malformed JSON, the signed-empty-body → {} payload
 * fallback, idempotent duplicate detection via the DB's ON CONFLICT DO
 * NOTHING, and the processor branch that only providers in EVENT_PROCESSORS
 * (currently just "factor") get — Error and non-Error throws both.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({ query: vi.fn(), queryOne: vi.fn() }))
vi.mock("@/lib/hub/credentials", () => ({ getCredentials: vi.fn() }))
vi.mock("@/lib/hub/integrations/factor", () => ({ processFactorEvent: vi.fn() }))

import { query, queryOne } from "@/lib/hub/db"
import { getCredentials } from "@/lib/hub/credentials"
import { processFactorEvent } from "@/lib/hub/integrations/factor"
import { signWebhookBody } from "@/lib/hub/integrations/webhooks"
import { POST } from "@/app/api/hub/webhooks/[provider]/route"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const getCredentialsMock = vi.mocked(getCredentials)
const processFactorEventMock = vi.mocked(processFactorEvent)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const SECRET = "whsec_test"

function call(
  provider: string,
  body: string,
  opts: { carrierId?: string | null; signature?: string | null; eventId?: string } = {}
) {
  const carrierId = opts.carrierId === undefined ? CARRIER : opts.carrierId
  const headers: Record<string, string> = {}
  if (opts.signature !== null) headers["x-loadoff-signature"] = opts.signature ?? signWebhookBody(body, SECRET)
  if (opts.eventId) headers["x-loadoff-event-id"] = opts.eventId
  const url = carrierId === null
    ? `http://test/api/hub/webhooks/${provider}`
    : `http://test/api/hub/webhooks/${provider}?carrier=${carrierId}`
  const req = new Request(url, { method: "POST", body, headers })
  return POST(req, { params: Promise.resolve({ provider }) })
}

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([])
  queryOneMock.mockReset().mockResolvedValue({ id: CARRIER })
  getCredentialsMock.mockReset().mockResolvedValue({ webhookSecret: SECRET })
  processFactorEventMock.mockReset()
})

describe("POST /api/hub/webhooks/[provider]", () => {
  it("404s an unknown provider before touching the DB", async () => {
    const res = await call("not-a-provider", "{}")
    expect(res.status).toBe(404)
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("400s a missing/malformed carrier id", async () => {
    const res = await call("factor", "{}", { carrierId: "not-a-uuid" })
    expect(res.status).toBe(400)
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("400s when the carrier query param is absent entirely", async () => {
    const res = await call("factor", "{}", { carrierId: null })
    expect(res.status).toBe(400)
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("404s an unknown carrier", async () => {
    queryOneMock.mockResolvedValue(null)
    const res = await call("factor", "{}")
    expect(res.status).toBe(404)
  })

  it("rejects a bad signature with 401 and logs the rejection, storing no event", async () => {
    const res = await call("factor", "{}", { signature: "deadbeef" })
    expect(res.status).toBe(401)
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.integration_syncs"),
      expect.arrayContaining([CARRIER, "webhook:factor"])
    )
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO hub.integration_events"), expect.anything())
  })

  it("still returns 401 when the rejection sync-log write itself fails", async () => {
    queryMock.mockRejectedValue(new Error("db down"))
    const res = await call("factor", "{}", { signature: "deadbeef" })
    expect(res.status).toBe(401)
  })

  it("rejects when the carrier has no webhook secret configured", async () => {
    getCredentialsMock.mockResolvedValue(null)
    const res = await call("factor", "{}")
    expect(res.status).toBe(401)
  })

  it("400s a validly signed but non-JSON body", async () => {
    const res = await call("factor", "not json")
    expect(res.status).toBe(400)
  })

  it("treats a validly signed empty body as an empty payload with null kind", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO hub.integration_events")) return [{ id: "evt-1" }]
      return []
    })
    const res = await call("factor", "", { eventId: "evt_empty" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, duplicate: false })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.integration_events"),
      [CARRIER, "factor", "evt_empty", null, "{}"]
    )
  })

  it("stores a well-formed event for a provider with no registered processor", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO hub.integration_events")) return [{ id: "evt-1" }]
      return []
    })
    const body = JSON.stringify({ event: "position.updated" })
    const res = await call("efs", body)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, duplicate: false })
    expect(processFactorEventMock).not.toHaveBeenCalled()
  })

  it("runs the factor processor, marks processed_at final, and reports duplicate:false", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO hub.integration_events")) return [{ id: "evt-1" }]
      return []
    })
    processFactorEventMock.mockResolvedValue({ applied: true, invoiceNumber: "INV-1" })
    const body = JSON.stringify({ event: "invoice.funded", invoiceNumber: "INV-1", amount: 100 })
    const res = await call("factor", body, { eventId: "evt_42" })
    expect(res.status).toBe(200)
    expect(processFactorEventMock).toHaveBeenCalledWith(
      CARRIER,
      expect.objectContaining({ external_id: "evt_42", kind: "invoice.funded" })
    )
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE hub.integration_events SET processed_at = NOW()"),
      [CARRIER, "factor", "evt_42"]
    )
  })

  it("leaves processed_at null when the processor can't yet match the event (transient miss)", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO hub.integration_events")) return [{ id: "evt-1" }]
      return []
    })
    processFactorEventMock.mockResolvedValue({ applied: false, invoiceNumber: null, reason: "no matching invoice" })
    const res = await call("factor", JSON.stringify({ event: "invoice.funded" }), { eventId: "evt_9" })
    expect(res.status).toBe(200)
    expect(queryMock).not.toHaveBeenCalledWith(
      expect.stringContaining("UPDATE hub.integration_events SET processed_at = NOW()"),
      expect.anything()
    )
  })

  it("catches a processor throw, stores the failure reason, and still stores the event", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO hub.integration_events")) return [{ id: "evt-1" }]
      return []
    })
    processFactorEventMock.mockRejectedValue(new Error("db unavailable"))
    const res = await call("factor", JSON.stringify({ event: "invoice.funded" }))
    expect(res.status).toBe(200)
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.integration_syncs"),
      expect.arrayContaining([
        CARRIER,
        "webhook:factor",
        expect.stringContaining("db unavailable"),
      ])
    )
  })

  it("reports a generic reason when the processor throws a non-Error value", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO hub.integration_events")) return [{ id: "evt-1" }]
      return []
    })
    processFactorEventMock.mockRejectedValue("string throw, not an Error")
    const res = await call("factor", JSON.stringify({ event: "invoice.funded" }))
    expect(res.status).toBe(200)
    expect(queryMock).not.toHaveBeenCalledWith(
      expect.stringContaining("UPDATE hub.integration_events SET processed_at = NOW()"),
      expect.anything()
    )
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.integration_syncs"),
      expect.arrayContaining([
        CARRIER,
        "webhook:factor",
        expect.stringContaining("processing failed"),
      ])
    )
  })

  it("reports a replayed event id as a no-op duplicate and skips the processor", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO hub.integration_events")) return []
      return []
    })
    const res = await call("factor", JSON.stringify({ event: "invoice.funded" }), { eventId: "evt_dupe" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, duplicate: true })
    expect(processFactorEventMock).not.toHaveBeenCalled()
  })
})
