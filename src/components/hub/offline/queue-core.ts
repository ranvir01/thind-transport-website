"use client"

/**
 * The offline action queue engine, shared by the driver app and the office.
 * Intents persist in IndexedDB and replay (in order) when the connection
 * returns. Extracted verbatim from driver/offline-queue.ts, which pioneered
 * the pattern; each side instantiates it with its OWN database and change
 * event. Separate databases are load-bearing: a shared store would hand one
 * side's rows to the other side's execute table, where unknown kinds are
 * silently dropped — a lost tap, the exact failure this queue exists to
 * prevent.
 */

/** Serialized file for offline uploads. */
export interface QueuedFile { name: string; type: string; buffer: ArrayBuffer }

export interface ReplayResult { sent: number; failed: number }

export interface QueueConfig {
  /** IndexedDB database name — unique per queue, never shared. */
  dbName: string
  /** window CustomEvent fired after every enqueue/remove. */
  changeEvent: string
  /**
   * The running app's payload-shape version. Rows stamped with a different
   * version are dropped at replay instead of handed to execute() with a
   * shape it was never built for.
   */
  schemaVersion: number
}

/** Does this error smell like "no signal" rather than a real rejection? */
export function isOfflineError(err: unknown): boolean {
  // Explicit === false: some runtimes (Node 21+) expose navigator without
  // onLine, and "no signal" must never become the default classification.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true
  // An aborted or timed-out request on a moving truck is a connectivity
  // failure, not a rejection — queuing is always safe (replays are
  // conflict-safe), while a hard error loses the tap. AbortError /
  // TimeoutError are DOMExceptions, so match by name rather than instanceof.
  const name = err && typeof err === "object" ? (err as { name?: unknown }).name : undefined
  if (name === "AbortError" || name === "TimeoutError") return true
  const message = err instanceof Error ? err.message : String(err)
  return /fetch failed|failed to fetch|network|load failed|ERR_INTERNET|timed? ?out|ETIMEDOUT|ECONNRESET/i.test(
    message
  )
}

const STORE = "queue"

export interface OfflineQueue<
  Pending extends { kind: string },
  Queued extends Pending & { id: string; queuedAt: number; schemaVersion?: number },
> {
  enqueueIntent(intent: Pending): Promise<void>
  listIntents(): Promise<Queued[]>
  removeIntent(id: string): Promise<void>
  queueCount(): Promise<number>
  replayQueue(
    intents: Queued[],
    execute: (intent: Queued) => Promise<{ ok: boolean; error?: string }>
  ): Promise<ReplayResult>
  runOrQueue<T extends { ok: boolean; error?: string }>(
    intent: Pending,
    exec: () => Promise<T>
  ): Promise<T | { ok: true; queued: true }>
}

export function createOfflineQueue<
  Pending extends { kind: string },
  Queued extends Pending & { id: string; queuedAt: number; schemaVersion?: number },
>(config: QueueConfig): OfflineQueue<Pending, Queued> {
  function openQueueDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // IDB version stays 1: a bump would fire onupgradeneeded on every
      // phone that already holds a queue, for nothing.
      const request = indexedDB.open(config.dbName, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE, { keyPath: "id" })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async function withStore<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await openQueueDb()
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = fn(tx.objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      // A failed request aborts the transaction rather than completing it, so
      // close() must run on every terminal path or the connection leaks —
      // the sync shells call into this queue every 30s for the life of a shift.
      tx.oncomplete = () => db.close()
      tx.onerror = () => db.close()
      tx.onabort = () => db.close()
    })
  }

  async function enqueueIntent(intent: Pending): Promise<void> {
    const full = {
      ...intent,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      queuedAt: Date.now(),
      schemaVersion: config.schemaVersion,
    }
    await withStore("readwrite", (store) => store.add(full))
    window.dispatchEvent(new CustomEvent(config.changeEvent))
  }

  async function listIntents(): Promise<Queued[]> {
    const all = await withStore<Queued[]>("readonly", (store) => store.getAll())
    return all.sort((a, b) => a.queuedAt - b.queuedAt)
  }

  async function removeIntent(id: string): Promise<void> {
    await withStore("readwrite", (store) => store.delete(id))
    window.dispatchEvent(new CustomEvent(config.changeEvent))
  }

  async function queueCount(): Promise<number> {
    return withStore<number>("readonly", (store) => store.count())
  }

  /**
   * Replays queued intents oldest-first (caller passes listIntents()'s output,
   * already sorted). A connectivity error stops the loop immediately so the
   * untouched remainder stays queued in order for the next signal; any other
   * throw drops just that intent so one bad payload can't jam everything
   * queued behind it. `sent` feeds the "N sent" success toast, `failed` the
   * "N couldn't be sent" error toast.
   *
   * A row stamped with a schemaVersion that doesn't match the running app's
   * is dropped before execute() ever sees it — it was queued under a payload
   * shape this build no longer knows how to send. Rows with no schemaVersion
   * (queued before the field existed) are treated as current.
   */
  async function replayQueue(
    intents: Queued[],
    execute: (intent: Queued) => Promise<{ ok: boolean; error?: string }>
  ): Promise<ReplayResult> {
    let sent = 0
    let failed = 0
    for (const intent of intents) {
      if (intent.schemaVersion !== undefined && intent.schemaVersion !== config.schemaVersion) {
        console.warn(
          `offline replay: dropped ${intent.kind} queued under schema v${intent.schemaVersion} (app is v${config.schemaVersion})`
        )
        await removeIntent(intent.id)
        failed++
        continue
      }
      try {
        const result = await execute(intent)
        // Real rejections (e.g. "not your load") drop the intent too —
        // retrying forever would be worse than telling the office.
        await removeIntent(intent.id)
        if (result.ok) sent++
        else {
          // Every drop says WHY: a drained queue with no server write is
          // otherwise undiagnosable from a CI artifact or a phone.
          console.warn(`offline replay: server rejected ${intent.kind} — dropped.`, result.error ?? "(no error text)")
          failed++
        }
      } catch (err) {
        if (isOfflineError(err)) break // still offline — try again on the next signal
        // A non-network throw (bad payload, server exception) isn't going to
        // fix itself on retry — drop it so it can't jam every intent queued
        // after it, since replay always starts from the oldest.
        console.warn(`offline replay: ${intent.kind} threw a non-network error — dropped.`, err)
        await removeIntent(intent.id)
        failed++
      }
    }
    return { sent, failed }
  }

  /**
   * Try the action now; if the network is gone, queue it and tell the truth
   * ("saved — sends when you have signal").
   */
  async function runOrQueue<T extends { ok: boolean; error?: string }>(
    intent: Pending,
    exec: () => Promise<T>
  ): Promise<T | { ok: true; queued: true }> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      await enqueueIntent(intent)
      return { ok: true, queued: true }
    }
    try {
      return await exec()
    } catch (err) {
      if (isOfflineError(err)) {
        await enqueueIntent(intent)
        return { ok: true, queued: true }
      }
      throw err
    }
  }

  return { enqueueIntent, listIntents, removeIntent, queueCount, replayQueue, runOrQueue }
}
