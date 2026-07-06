/**
 * Integration framework contract — what every provider (mock or real) must
 * satisfy before credentials ever exist. Pure: registry invariants, the mock
 * adapter's idempotency semantics, and webhook signature math.
 */
import { describe, expect, it } from "vitest"
import { PROVIDERS, allowedFields, providerSpec } from "../integrations/registry"
import { memorySink, mockLoadSource, mockSource } from "../integrations/mock"
import { signWebhookBody, verifyWebhookSignature, webhookEventId } from "../integrations/webhooks"

describe("provider registry invariants", () => {
  it("ids are unique, lowercase slugs matching the DB shape constraint", () => {
    const ids = PROVIDERS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9_-]{1,39}$/)
  })

  it("every provider declares credential fields and an always-working fallback", () => {
    for (const p of PROVIDERS) {
      expect(p.fields.length, p.id).toBeGreaterThan(0)
      expect(p.fallback.length, p.id).toBeGreaterThan(0)
    }
  })

  it("live poll providers name their cron job", () => {
    for (const p of PROVIDERS.filter((p) => p.status === "live" && p.sync === "poll")) {
      expect(p.cronJob, p.id).toBeTruthy()
    }
  })

  it("allowedFields derives from the registry (unknown provider → empty)", () => {
    expect(allowedFields("terminal")).toEqual(["apiKey", "connectionToken"])
    expect(allowedFields("nope")).toEqual([])
    expect(providerSpec("factor")?.sync).toBe("webhook")
  })
})

describe("adapter contract (mock reference implementation)", () => {
  it("pull is deterministic and replays never duplicate through the sink", async () => {
    const source = mockSource({ provider: "mock-fuel", rows: 4 })
    const sink = memorySink()
    const first = sink.ingest("carrier-1", "mock-fuel", await source.pull())
    const replay = sink.ingest("carrier-1", "mock-fuel", await source.pull())
    expect(first).toEqual({ inserted: 4, skipped: 0 })
    expect(replay).toEqual({ inserted: 0, skipped: 4 })
    expect(sink.rows).toHaveLength(4)
  })

  it("the same external ids land separately per carrier and per source", async () => {
    const source = mockSource({ rows: 2 })
    const sink = memorySink()
    sink.ingest("carrier-1", "mock", await source.pull())
    const other = sink.ingest("carrier-2", "mock", await source.pull())
    expect(other.inserted).toBe(2)
  })

  it("a disconnected source refuses to pull instead of returning junk", async () => {
    const source = mockSource({ connected: false })
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.pull()).rejects.toThrow(/not connected/)
  })
})

describe("LoadSource contract (mock reference implementation)", () => {
  it("search is deterministic per criteria and carries a stable external id", async () => {
    const source = mockLoadSource({ provider: "mock-loadboard", rows: 2 })
    const first = await source.search({ originState: "WA" })
    const replay = await source.search({ originState: "WA" })
    expect(first.map((r) => r.external_id)).toEqual(replay.map((r) => r.external_id))
    expect(first).toHaveLength(2)
  })

  it("a disconnected source refuses to search instead of returning junk", async () => {
    const source = mockLoadSource({ connected: false })
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.search({ originState: "WA" })).rejects.toThrow(/not connected/)
  })
})

describe("webhook signature + event identity", () => {
  const secret = "whsec_test_0123456789"
  const body = JSON.stringify({ event: "invoice.paid", id: "evt_42" })

  it("accepts a correctly signed body and rejects everything else", () => {
    const sig = signWebhookBody(body, secret)
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true)
    expect(verifyWebhookSignature(body, sig, "wrong-secret")).toBe(false)
    expect(verifyWebhookSignature(body + " ", sig, secret)).toBe(false)
    expect(verifyWebhookSignature(body, "deadbeef", secret)).toBe(false)
    expect(verifyWebhookSignature(body, null, secret)).toBe(false)
    expect(verifyWebhookSignature(body, sig, null)).toBe(false)
    expect(verifyWebhookSignature(body, "not-hex!!", secret)).toBe(false)
  })

  it("event id prefers the provider's header id, else hashes content stably", () => {
    expect(webhookEventId(body, "evt_42")).toBe("evt_42")
    const a = webhookEventId(body, null)
    const b = webhookEventId(body, undefined)
    expect(a).toBe(b)
    expect(a).toHaveLength(40)
    expect(webhookEventId(body + "x", null)).not.toBe(a)
  })
})
