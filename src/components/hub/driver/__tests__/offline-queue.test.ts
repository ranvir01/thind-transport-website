import { afterEach, describe, expect, it, vi } from "vitest"

import {
  enqueueIntent, isOfflineError, listIntents, queueCount, QUEUE_SCHEMA_VERSION, removeIntent,
  replayQueue, runOrQueue,
} from "../offline-queue"

/**
 * isOfflineError decides whether a failed driver tap gets queued for replay
 * (connectivity problem) or surfaced as a hard error (real rejection).
 * Misclassifying a flaky-signal failure as a rejection loses the tap.
 */
describe("isOfflineError", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("treats navigator.onLine === false as offline regardless of the error", () => {
    vi.stubGlobal("navigator", { onLine: false })
    expect(isOfflineError(new Error("Forbidden"))).toBe(true)
  })

  it("matches classic fetch connectivity messages", () => {
    expect(isOfflineError(new Error("fetch failed"))).toBe(true)
    expect(isOfflineError(new TypeError("Failed to fetch"))).toBe(true)
    expect(isOfflineError(new Error("A network error occurred"))).toBe(true)
    expect(isOfflineError(new Error("Load failed"))).toBe(true)
    expect(isOfflineError(new Error("net::ERR_INTERNET_DISCONNECTED"))).toBe(true)
  })

  it("treats an aborted request as offline (fetch timeout on flaky signal)", () => {
    const abort = new Error("The user aborted a request.")
    abort.name = "AbortError"
    expect(isOfflineError(abort)).toBe(true)
  })

  it("treats AbortSignal.timeout's TimeoutError as offline", () => {
    const timeout = new Error("The operation was aborted due to timeout")
    timeout.name = "TimeoutError"
    expect(isOfflineError(timeout)).toBe(true)
  })

  it("matches by name even when the throw is a DOMException-like non-Error", () => {
    expect(isOfflineError({ name: "AbortError", message: "signal is aborted" })).toBe(true)
  })

  it("matches timeout-flavored messages from proxies and node runtimes", () => {
    expect(isOfflineError(new Error("Request timed out"))).toBe(true)
    expect(isOfflineError(new Error("Gateway timeout"))).toBe(true)
    expect(isOfflineError(new Error("connect ETIMEDOUT 10.0.0.1:443"))).toBe(true)
    expect(isOfflineError(new Error("socket hang up (ECONNRESET)"))).toBe(true)
  })

  it("does NOT queue real rejections — those must surface to the driver", () => {
    expect(isOfflineError(new Error("Forbidden"))).toBe(false)
    expect(isOfflineError(new Error("Load already delivered"))).toBe(false)
    expect(isOfflineError(new Error("Invalid payload"))).toBe(false)
    expect(isOfflineError("string rejection")).toBe(false)
    expect(isOfflineError(null)).toBe(false)
  })
})

/**
 * Minimal in-memory IndexedDB — just the surface offline-queue touches
 * (open → transaction → objectStore → add/getAll/delete/count). Requests
 * resolve on a microtask so onsuccess handlers attach first, like real IDB.
 */
function makeFakeIndexedDB() {
  const rows = new Map<string, { id: string }>()
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
  return { indexedDB: { open: () => request(db) }, rows }
}

/**
 * runOrQueue is the driver app's no-lost-taps guarantee: offline (or a
 * connectivity throw) must queue the intent, real rejections must surface.
 * Pinned via facility-note — the intent kind that shipped without it once.
 */
describe("runOrQueue", () => {
  const noteIntent = {
    kind: "facility-note" as const,
    payload: { facilityId: "f1", body: "gate 4 is the fast one", tags: ["fast"] },
  }

  function stubOfflineWorld(onLine: boolean) {
    const fake = makeFakeIndexedDB()
    vi.stubGlobal("indexedDB", fake.indexedDB)
    vi.stubGlobal("navigator", { onLine })
    vi.stubGlobal("window", { dispatchEvent: () => {} })
    return fake
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("queues a facility-note without calling the action when the device is offline", async () => {
    stubOfflineWorld(false)
    const exec = vi.fn()
    const result = await runOrQueue(noteIntent, exec)
    expect(result).toEqual({ ok: true, queued: true })
    expect(exec).not.toHaveBeenCalled()
    const queued = await listIntents()
    expect(queued).toHaveLength(1)
    expect(queued[0].kind).toBe("facility-note")
    expect(queued[0].payload).toEqual(noteIntent.payload)
    // Stamped so a future payload-shape change can tell this row apart from
    // one queued under the new shape.
    expect(queued[0].schemaVersion).toBe(QUEUE_SCHEMA_VERSION)
  })

  it("queues when the action throws a connectivity error mid-flight", async () => {
    stubOfflineWorld(true)
    const exec = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    const result = await runOrQueue(noteIntent, exec)
    expect(result).toEqual({ ok: true, queued: true })
    expect((await listIntents())[0]?.kind).toBe("facility-note")
  })

  it("rethrows real rejections instead of queuing them", async () => {
    stubOfflineWorld(true)
    const exec = vi.fn().mockRejectedValue(new Error("Forbidden"))
    await expect(runOrQueue(noteIntent, exec)).rejects.toThrow("Forbidden")
    expect(await listIntents()).toHaveLength(0)
  })
})

/**
 * replayQueue is OfflineSync's replay loop, extracted so it's testable
 * without mounting a React component. It's the no-lost-taps guarantee once
 * the driver is back in signal: process oldest-first, stop clean on a
 * connectivity error (retry next signal), drop-and-count on a hard failure
 * (it won't fix itself, and it can't be allowed to jam everything behind it).
 */
describe("replayQueue", () => {
  function makeIntent(id: string, queuedAt: number, schemaVersion?: number) {
    return {
      id,
      kind: "facility-note" as const,
      payload: { facilityId: "f1", body: "gate 4 is the fast one", tags: ["fast"] },
      queuedAt,
      schemaVersion,
    }
  }

  function stubQueueWorld(intents: ReturnType<typeof makeIntent>[]) {
    const fake = makeFakeIndexedDB()
    vi.stubGlobal("indexedDB", fake.indexedDB)
    vi.stubGlobal("navigator", { onLine: true })
    vi.stubGlobal("window", { dispatchEvent: () => {} })
    for (const intent of intents) fake.rows.set(intent.id, intent)
    return fake
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("replays oldest-first and reports every success as sent", async () => {
    const intents = [makeIntent("a", 100), makeIntent("b", 200), makeIntent("c", 300)]
    stubQueueWorld(intents)
    const order: string[] = []
    const execute = vi.fn(async (intent) => {
      order.push(intent.id)
      return { ok: true }
    })
    const result = await replayQueue(intents, execute)
    expect(order).toEqual(["a", "b", "c"])
    expect(result).toEqual({ sent: 3, failed: 0 })
    expect(await listIntents()).toHaveLength(0)
  })

  it("drops a hard failure but keeps replaying the rest of the queue", async () => {
    const intents = [makeIntent("a", 100), makeIntent("b", 200), makeIntent("c", 300)]
    stubQueueWorld(intents)
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("Invalid payload"))
      .mockResolvedValueOnce({ ok: true })
    const result = await replayQueue(intents, execute)
    expect(execute).toHaveBeenCalledTimes(3)
    expect(result).toEqual({ sent: 2, failed: 1 })
    // The hard failure is dropped too — retrying it would jam every intent
    // queued behind it, and it isn't going to succeed on its own.
    expect(await listIntents()).toHaveLength(0)
  })

  it("stops clean at the first connectivity error, leaving the remainder queued in order", async () => {
    const intents = [makeIntent("a", 100), makeIntent("b", 200), makeIntent("c", 300)]
    stubQueueWorld(intents)
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true })
    const result = await replayQueue(intents, execute)
    // Never attempts "c" — signal dropped mid-queue, so it stops rather than
    // replaying out of order.
    expect(execute).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ sent: 1, failed: 0 })
    const remaining = await listIntents()
    expect(remaining.map((i) => i.id)).toEqual(["b", "c"])
  })

  it("drops a row stamped with a stale schemaVersion without calling execute", async () => {
    const intents = [
      makeIntent("a", 100, QUEUE_SCHEMA_VERSION - 1),
      makeIntent("b", 200, QUEUE_SCHEMA_VERSION),
    ]
    stubQueueWorld(intents)
    const execute = vi.fn(async () => ({ ok: true }))
    const result = await replayQueue(intents, execute)
    // Only "b" (current version) reaches execute — "a" is dropped outright,
    // it was queued under a payload shape this build no longer sends.
    expect(execute).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }))
    expect(result).toEqual({ sent: 1, failed: 1 })
    expect(await listIntents()).toHaveLength(0)
  })

  it("treats a row with no schemaVersion (queued before the field existed) as current", async () => {
    const intents = [makeIntent("a", 100, undefined)]
    stubQueueWorld(intents)
    const execute = vi.fn(async () => ({ ok: true }))
    const result = await replayQueue(intents, execute)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ sent: 1, failed: 0 })
  })
})

/**
 * listIntents is what OfflineSync and replayQueue's callers hand a replay
 * order to — a driver's taps must replay in the order they happened
 * (arrived-then-departed can't ever execute out of order), independent of
 * whatever order IndexedDB's getAll() happens to return rows in.
 */
describe("listIntents", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sorts by queuedAt ascending regardless of storage order", async () => {
    const fake = makeFakeIndexedDB()
    vi.stubGlobal("indexedDB", fake.indexedDB)
    // Inserted newest-first so a passthrough (unsorted) implementation would
    // fail this test.
    fake.rows.set("z", { id: "z", kind: "ack", payload: { loadId: "L3" }, queuedAt: 300 })
    fake.rows.set("a", { id: "a", kind: "ack", payload: { loadId: "L1" }, queuedAt: 100 })
    fake.rows.set("m", { id: "m", kind: "ack", payload: { loadId: "L2" }, queuedAt: 200 })

    const result = await listIntents()
    expect(result.map((i) => i.id)).toEqual(["a", "m", "z"])
  })
})

/**
 * enqueueIntent/removeIntent are the only writers of the queue, and both
 * fire "hauldesk-queue-changed" so OfflineSync's pending-count badge stays
 * honest without polling. A regression here wouldn't fail loudly — the
 * badge would just quietly stop updating.
 */
describe("enqueueIntent / removeIntent / queueCount", () => {
  function stubWorld() {
    const fake = makeFakeIndexedDB()
    vi.stubGlobal("indexedDB", fake.indexedDB)
    const dispatchEvent = vi.fn()
    vi.stubGlobal("window", { dispatchEvent })
    return { fake, dispatchEvent }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("stamps a unique id, the current queuedAt, and notifies listeners", async () => {
    const { dispatchEvent } = stubWorld()
    const before = Date.now()
    await enqueueIntent({ kind: "ack", payload: { loadId: "L1" } })
    const after = Date.now()

    expect(dispatchEvent).toHaveBeenCalledTimes(1)
    expect(dispatchEvent.mock.calls[0][0]).toMatchObject({ type: "hauldesk-queue-changed" })

    const [row] = await listIntents()
    expect(row.id).toBeTruthy()
    expect(row.queuedAt).toBeGreaterThanOrEqual(before)
    expect(row.queuedAt).toBeLessThanOrEqual(after)
    expect(row.schemaVersion).toBe(QUEUE_SCHEMA_VERSION)
  })

  it("queueCount tracks adds and removes, both notifying listeners", async () => {
    const { dispatchEvent } = stubWorld()
    expect(await queueCount()).toBe(0)

    await enqueueIntent({ kind: "ack", payload: { loadId: "L1" } })
    await enqueueIntent({ kind: "ack", payload: { loadId: "L2" } })
    expect(await queueCount()).toBe(2)

    const [first] = await listIntents()
    await removeIntent(first.id)
    expect(await queueCount()).toBe(1)

    // 2 enqueues + 1 remove — every write notifies, not just enqueue.
    expect(dispatchEvent).toHaveBeenCalledTimes(3)
  })
})
