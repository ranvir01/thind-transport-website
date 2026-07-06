/**
 * The integration adapter contract every provider (mock or real) must
 * satisfy before credentials ever exist. Pure: the mock reference
 * implementation's idempotency semantics and disconnected-refusal.
 */
import { describe, expect, it } from "vitest"
import { memorySink, mockSource } from "../integrations/mock"

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
    const otherCarrier = sink.ingest("carrier-2", "mock", await source.pull())
    const otherSource = sink.ingest("carrier-1", "other-source", await source.pull())
    expect(otherCarrier.inserted).toBe(2)
    expect(otherSource.inserted).toBe(2)
  })

  it("a disconnected source refuses to pull instead of returning junk", async () => {
    const source = mockSource({ connected: false })
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.pull()).rejects.toThrow(/not connected/)
  })
})
