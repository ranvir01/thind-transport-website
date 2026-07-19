import { afterEach, describe, expect, it, vi } from "vitest"

import { isOfflineError, listIntents, runOrQueue } from "../offline-queue"

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
