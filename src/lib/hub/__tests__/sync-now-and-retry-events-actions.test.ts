/**
 * syncIntegrationNowAction/retryIntegrationEventsAction had zero test
 * coverage — the "Sync now" and "Retry events" buttons on every connected
 * integration card route through here (src/app/hub/_actions/integrations.ts).
 * Covers: the not-yet-connected message, one dispatch case per provider
 * wired into runProviderSync, the "no sync loop wired" guard for a provider
 * that isn't, a sync failure landing in hub.integration_syncs, and event
 * retries dispatching through the shared retryUnprocessedEvents (whose
 * per-provider guard is covered in event-processors.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requireOwner: vi.fn(async () => ({ id: "u1", name: "Owner", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/telematics", () => ({ runTelematicsSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/efs", () => ({ runEfsSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/comdata", () => ({ runComdataSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/wex", () => ({ runWexSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/qbo", () => ({ runQboSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/event-processors", () => ({ retryUnprocessedEvents: vi.fn() }))
vi.mock("@/lib/hub/mailbox", () => ({ pollDocsMailbox: vi.fn() }))

import { query } from "@/lib/hub/db"
import { runTelematicsSync } from "@/lib/hub/telematics"
import { runEfsSync } from "@/lib/hub/integrations/efs"
import { runComdataSync } from "@/lib/hub/integrations/comdata"
import { runWexSync } from "@/lib/hub/integrations/wex"
import { runQboSync } from "@/lib/hub/integrations/qbo"
import { retryUnprocessedEvents } from "@/lib/hub/integrations/event-processors"
import { pollDocsMailbox } from "@/lib/hub/mailbox"
import { retryIntegrationEventsAction, syncIntegrationNowAction } from "@/app/hub/_actions/integrations"
import { PROVIDERS } from "@/lib/hub/integrations/registry"
import type { IntegrationProvider } from "@/lib/hub/credentials"

const queryMock = vi.mocked(query)
const runTelematicsSyncMock = vi.mocked(runTelematicsSync)
const runEfsSyncMock = vi.mocked(runEfsSync)
const runComdataSyncMock = vi.mocked(runComdataSync)
const runWexSyncMock = vi.mocked(runWexSync)
const runQboSyncMock = vi.mocked(runQboSync)
const retryUnprocessedEventsMock = vi.mocked(retryUnprocessedEvents)
const pollDocsMailboxMock = vi.mocked(pollDocsMailbox)

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([])
  runTelematicsSyncMock.mockReset()
  runEfsSyncMock.mockReset()
  runComdataSyncMock.mockReset()
  runWexSyncMock.mockReset()
  runQboSyncMock.mockReset()
  retryUnprocessedEventsMock.mockReset()
  pollDocsMailboxMock.mockReset()
})

describe("syncIntegrationNowAction", () => {
  it("reports not-yet-connected instead of a raw error", async () => {
    runEfsSyncMock.mockResolvedValue({ connected: false })
    const result = await syncIntegrationNowAction("efs")
    expect(result).toEqual({
      ok: false,
      error: "efs isn't connected yet — save credentials first. The fallback keeps working meanwhile.",
    })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it.each([
    ["terminal", runTelematicsSyncMock, { connected: true, pings: 3, hos: 1 }, /3 positions, 1 HOS clocks/],
    ["truckercloud", runTelematicsSyncMock, { connected: true, pings: 0, hos: 0 }, /0 positions, 0 HOS clocks/],
    ["efs", runEfsSyncMock, { connected: true, imported: 2, skipped: 1 }, /2 fuel transactions, 1 already synced/],
    ["comdata", runComdataSyncMock, { connected: true, imported: 5 }, /5 fuel transactions/],
    ["wex", runWexSyncMock, { connected: true, imported: 4 }, /4 fuel transactions/],
    ["qbo", runQboSyncMock, { connected: true, imported: 2 }, /2 payments recorded/],
    ["mailbox", pollDocsMailboxMock, { connected: true, filed: 3, unmatched: 1 }, /3 documents filed, 1 unmatched/],
    ["mailbox", pollDocsMailboxMock, { connected: true, filed: 0, unmatched: 0 }, /^0 documents filed$/],
  ] as const)("dispatches %s to its sync loop and logs a successful sync", async (provider, mockFn, resolved, summaryPattern) => {
    mockFn.mockResolvedValue(resolved)
    const result = await syncIntegrationNowAction(provider)
    expect(result.ok).toBe(true)
    expect(result.summary).toMatch(summaryPattern)
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.integration_syncs"),
      expect.arrayContaining(["carrier-1", provider])
    )
  })

  it("throws for a provider with no sync loop wired (e.g. DAT search is on-demand)", async () => {
    const result = await syncIntegrationNowAction("dat")
    expect(result.ok).toBe(false)
    expect(result.error).toBe("No sync loop wired for dat yet")
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.integration_syncs"),
      expect.arrayContaining(["carrier-1", "dat", "No sync loop wired for dat yet"])
    )
  })

  it("logs a failed mailbox sync when connect or token minting throws", async () => {
    pollDocsMailboxMock.mockRejectedValue(new Error("invalid_client"))
    const result = await syncIntegrationNowAction("mailbox")
    expect(result.ok).toBe(false)
    expect(result.error).toBe("invalid_client")
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.integration_syncs"),
      expect.arrayContaining(["carrier-1", "mailbox", "invalid_client"])
    )
  })

  it("logs a failed sync when the provider client throws", async () => {
    runEfsSyncMock.mockRejectedValue(new Error("feed unreachable"))
    const result = await syncIntegrationNowAction("efs")
    expect(result.ok).toBe(false)
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.integration_syncs"),
      expect.arrayContaining(["carrier-1", "efs", expect.any(String), "feed unreachable"])
    )
  })
})

describe("retryIntegrationEventsAction", () => {
  it("retries unprocessed events for the given provider and summarizes the outcome", async () => {
    retryUnprocessedEventsMock.mockResolvedValue({ retried: 5, applied: 3, stillUnprocessed: 2 })
    const result = await retryIntegrationEventsAction("factor")
    expect(result).toEqual({ ok: true, summary: "3 applied, 2 still unmatched (of 5 retried)" })
    expect(retryUnprocessedEventsMock).toHaveBeenCalledWith("carrier-1", "factor")
  })

  it("surfaces the no-retry-wired refusal from retryUnprocessedEvents", async () => {
    retryUnprocessedEventsMock.mockRejectedValue(new Error("No event retry wired for qbo yet"))
    const result = await retryIntegrationEventsAction("qbo")
    expect(result.ok).toBe(false)
    expect(result.error).toBe("No event retry wired for qbo yet")
  })
})

describe("registry ↔ runProviderSync dispatch drift", () => {
  // The it.each above hand-lists which providers dispatch successfully — a
  // regression there and a `sync: "poll"` registry entry could drift apart
  // silently (settings/integrations/page.tsx now derives its "Sync now"
  // button from `spec.sync === "poll"` alone, per the card's canSync
  // comment). These two tests iterate the registry itself so a new poll
  // provider added without a runProviderSync case — or a manual/webhook
  // provider mistakenly marked "poll" — fails here instead of only
  // surfacing as a live "No sync loop wired" toast.
  beforeEach(() => {
    runTelematicsSyncMock.mockResolvedValue({ connected: true })
    runEfsSyncMock.mockResolvedValue({ connected: true })
    runComdataSyncMock.mockResolvedValue({ connected: true })
    runWexSyncMock.mockResolvedValue({ connected: true })
    runQboSyncMock.mockResolvedValue({ connected: true })
    pollDocsMailboxMock.mockResolvedValue({ connected: true })
  })

  const pollProviders = PROVIDERS.filter((p) => p.sync === "poll").map((p) => p.id as IntegrationProvider)
  const nonPollProviders = PROVIDERS.filter((p) => p.sync !== "poll").map((p) => p.id as IntegrationProvider)

  it.each(pollProviders)("every registry poll provider (%s) has a working runProviderSync case", async (provider) => {
    const result = await syncIntegrationNowAction(provider)
    expect(result.error).not.toBe(`No sync loop wired for ${provider} yet`)
  })

  it.each(nonPollProviders)("every non-poll provider (%s) has no manual sync dispatch, by design", async (provider) => {
    const result = await syncIntegrationNowAction(provider)
    expect(result).toEqual({ ok: false, error: `No sync loop wired for ${provider} yet` })
  })
})
