import { afterEach, describe, expect, it, vi } from "vitest"

import { createOfflineQueue } from "../queue-core"

/**
 * The engine's behavior is pinned by the driver suite (which exercises it
 * through the driver shim). What only THIS suite can cover is the config
 * seam: two queues must stay strangers — each opening its OWN database and
 * announcing changes on its OWN event — and each must drop rows stamped with
 * a schema version its own config no longer speaks. A shared database would
 * hand one side's rows to the other side's execute table, where unknown
 * kinds are silently dropped.
 */

type TestPending = { kind: string; payload: { v: number } }
type TestQueued = TestPending & { id: string; queuedAt: number; schemaVersion?: number }

function makeFakeIndexedDB() {
  const rows = new Map<string, { id: string; [k: string]: unknown }>()
  const openedNames: string[] = []
  const request = <T,>(result: T) => {
    const r = { onsuccess: null as (() => void) | null, onerror: null, error: null, result }
    queueMicrotask(() => r.onsuccess?.())
    return r
  }
  const store = {
    add: (value: { id: string }) => (rows.set(value.id, value), request(undefined)),
    getAll: () => request([...rows.values()]),
    delete: (id: string) => (rows.delete(id), request(undefined)),
    count: () => request(rows.size),
  }
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => {},
    transaction: () => ({ objectStore: () => store, oncomplete: null }),
    close: () => {},
  }
  return {
    indexedDB: {
      open: (name: string) => (openedNames.push(name), request(db)),
    },
    rows,
    openedNames,
  }
}

function stubWorld() {
  const fake = makeFakeIndexedDB()
  const events: string[] = []
  vi.stubGlobal("indexedDB", fake.indexedDB)
  vi.stubGlobal("navigator", { onLine: true })
  vi.stubGlobal("window", { dispatchEvent: (e: Event) => void events.push(e.type) })
  return { fake, events }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createOfflineQueue config seam", () => {
  it("opens the database the config names — never a hardcoded one", async () => {
    const { fake } = stubWorld()
    const q = createOfflineQueue<TestPending, TestQueued>({
      dbName: "hauldesk-office",
      changeEvent: "hauldesk-office-queue-changed",
      schemaVersion: 1,
    })
    await q.enqueueIntent({ kind: "x", payload: { v: 1 } })
    expect(fake.openedNames).toContain("hauldesk-office")
    expect(fake.openedNames).not.toContain("hauldesk-driver")
  })

  it("announces enqueue and remove on the configured event, not the driver's", async () => {
    const { events } = stubWorld()
    const q = createOfflineQueue<TestPending, TestQueued>({
      dbName: "test-db",
      changeEvent: "test-queue-changed",
      schemaVersion: 1,
    })
    await q.enqueueIntent({ kind: "x", payload: { v: 1 } })
    const [row] = await q.listIntents()
    await q.removeIntent(row.id)
    expect(events).toEqual(["test-queue-changed", "test-queue-changed"])
  })

  it("stamps rows with the configured schema version and drops mismatches at replay", async () => {
    stubWorld()
    const q = createOfflineQueue<TestPending, TestQueued>({
      dbName: "test-db",
      changeEvent: "test-queue-changed",
      schemaVersion: 7,
    })
    await q.enqueueIntent({ kind: "current", payload: { v: 1 } })
    const rows = await q.listIntents()
    expect(rows[0].schemaVersion).toBe(7)

    // A row from an older build of THIS queue must be dropped, not executed.
    const stale: TestQueued = { id: "old", kind: "stale", payload: { v: 0 }, queuedAt: 0, schemaVersion: 6 }
    const execute = vi.fn(async (_intent: TestQueued) => ({ ok: true }))
    const result = await q.replayQueue([stale, ...rows], execute)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(execute.mock.calls[0][0].kind).toBe("current")
    expect(result).toEqual({ sent: 1, failed: 1 })
  })
})
