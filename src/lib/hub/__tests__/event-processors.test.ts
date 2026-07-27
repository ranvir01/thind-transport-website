/**
 * retryUnprocessedEvents (integrations/event-processors.ts) — the generic
 * re-drain that replaced the factor-only retryUnprocessedFactorEvents. Same
 * behavioral contract as before (apply what you can, mark deliberate no-ops
 * done, leave transient misses pending, cap at 50) but proven per-provider:
 * an EFS file drop that failed mid-ingest is retryable the same way a factor
 * funding event is, and an unwired provider is refused up front.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../integrations/factor", () => ({ processFactorEvent: vi.fn() }))
vi.mock("../integrations/efs", () => ({ processEfsEvent: vi.fn() }))
vi.mock("../integrations/wex", () => ({ processWexEvent: vi.fn() }))
vi.mock("../integrations/comdata", () => ({ processComdataEvent: vi.fn() }))

import { query } from "../db"
import { processFactorEvent } from "../integrations/factor"
import { processEfsEvent } from "../integrations/efs"
import { processWexEvent } from "../integrations/wex"
import { processComdataEvent } from "../integrations/comdata"
import { EVENT_PROCESSORS, EVENT_RETRY_PROVIDERS, retryUnprocessedEvents } from "../integrations/event-processors"

const queryMock = vi.mocked(query)
const processFactorEventMock = vi.mocked(processFactorEvent)
const processEfsEventMock = vi.mocked(processEfsEvent)
const processWexEventMock = vi.mocked(processWexEvent)
const processComdataEventMock = vi.mocked(processComdataEvent)

const CARRIER = "44444444-4444-4444-4444-444444444444"

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([])
  processFactorEventMock.mockReset()
  processEfsEventMock.mockReset()
  processWexEventMock.mockReset()
  processComdataEventMock.mockReset()
})

describe("EVENT_RETRY_PROVIDERS", () => {
  it("derives from the processor map — no hand-maintained second list", () => {
    expect(EVENT_RETRY_PROVIDERS).toEqual(new Set(Object.keys(EVENT_PROCESSORS)))
    expect(EVENT_RETRY_PROVIDERS.has("factor")).toBe(true)
    expect(EVENT_RETRY_PROVIDERS.has("efs")).toBe(true)
    expect(EVENT_RETRY_PROVIDERS.has("wex")).toBe(true)
    expect(EVENT_RETRY_PROVIDERS.has("comdata")).toBe(true)
  })
})

describe("retryUnprocessedEvents", () => {
  it("refuses a provider with no processor before touching the DB", async () => {
    await expect(retryUnprocessedEvents(CARRIER, "qbo")).rejects.toThrow("No event retry wired for qbo yet")
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("no-ops when nothing is pending, scoped to the requested provider", async () => {
    queryMock.mockResolvedValueOnce([])
    const result = await retryUnprocessedEvents(CARRIER, "factor")
    expect(result).toEqual({ retried: 0, applied: 0, stillUnprocessed: 0 })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("provider = $2"),
      [CARRIER, "factor"]
    )
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("LIMIT 50"), [CARRIER, "factor"])
  })

  it("applies what it can, marks deliberate no-ops done, leaves transient misses pending", async () => {
    queryMock.mockResolvedValueOnce([
      { id: "1", external_id: "evt-1", kind: "invoice.funded", payload: { invoiceNumber: "INV-1", amount: 100 } },
      { id: "2", external_id: "evt-2", kind: "invoice.rejected", payload: {} },
      { id: "3", external_id: "evt-3", kind: "invoice.funded", payload: { invoiceNumber: "INV-404", amount: 50 } },
    ])
    processFactorEventMock
      .mockResolvedValueOnce({ applied: true, invoiceNumber: "INV-1" })
      .mockResolvedValueOnce({ applied: false, invoiceNumber: null, reason: "unhandled event kind: invoice.rejected" })
      .mockResolvedValueOnce({ applied: false, invoiceNumber: "INV-404", reason: "no matching invoice" })

    const result = await retryUnprocessedEvents(CARRIER, "factor")

    expect(result).toEqual({ retried: 3, applied: 1, stillUnprocessed: 1 })
    // evt-1 (applied) and evt-2 (unhandled kind — deliberate no-op) both get marked processed;
    // evt-3 (no matching invoice yet) is left for a later retry.
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.integration_events"), ["1", CARRIER])
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.integration_events"), ["2", CARRIER])
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.integration_events"), ["3", CARRIER])
    expect(processEfsEventMock).not.toHaveBeenCalled()
  })

  it("re-drives a stuck efs file drop through processEfsEvent — the gap the factor-only retry left", async () => {
    queryMock.mockResolvedValueOnce([
      { id: "10", external_id: "drop-1", kind: "fuel.batch", payload: { csv: "…" } },
    ])
    processEfsEventMock.mockResolvedValueOnce({ applied: true, imported: 2, skipped: 0 })

    const result = await retryUnprocessedEvents(CARRIER, "efs")

    expect(result).toEqual({ retried: 1, applied: 1, stillUnprocessed: 0 })
    expect(processEfsEventMock).toHaveBeenCalledWith(CARRIER, { external_id: "drop-1", kind: "fuel.batch", payload: { csv: "…" } })
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.integration_events"), ["10", CARRIER])
    expect(processFactorEventMock).not.toHaveBeenCalled()
  })

  it("re-drives a stuck wex file drop through processWexEvent (registered 2026-07-18)", async () => {
    queryMock.mockResolvedValueOnce([
      { id: "20", external_id: "drop-2", kind: "fuel.batch", payload: { csv: "…" } },
    ])
    processWexEventMock.mockResolvedValueOnce({ applied: true, imported: 1, skipped: 0 })

    const result = await retryUnprocessedEvents(CARRIER, "wex")

    expect(result).toEqual({ retried: 1, applied: 1, stillUnprocessed: 0 })
    expect(processWexEventMock).toHaveBeenCalledWith(CARRIER, { external_id: "drop-2", kind: "fuel.batch", payload: { csv: "…" } })
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.integration_events"), ["20", CARRIER])
    expect(processFactorEventMock).not.toHaveBeenCalled()
    expect(processEfsEventMock).not.toHaveBeenCalled()
  })

  it("re-drives a stuck comdata file drop through processComdataEvent (registered 2026-07-18)", async () => {
    queryMock.mockResolvedValueOnce([
      { id: "30", external_id: "drop-3", kind: "fuel.batch", payload: { csv: "…" } },
    ])
    processComdataEventMock.mockResolvedValueOnce({ applied: true, imported: 3, skipped: 0 })

    const result = await retryUnprocessedEvents(CARRIER, "comdata")

    expect(result).toEqual({ retried: 1, applied: 1, stillUnprocessed: 0 })
    expect(processComdataEventMock).toHaveBeenCalledWith(CARRIER, { external_id: "drop-3", kind: "fuel.batch", payload: { csv: "…" } })
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.integration_events"), ["30", CARRIER])
    expect(processFactorEventMock).not.toHaveBeenCalled()
    expect(processEfsEventMock).not.toHaveBeenCalled()
    expect(processWexEventMock).not.toHaveBeenCalled()
  })
})
