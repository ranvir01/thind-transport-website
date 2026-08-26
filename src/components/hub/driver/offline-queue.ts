"use client"

/**
 * Offline action queue for the driver app. Drivers lose signal constantly at
 * rural shippers — taps must never be lost. Intents persist in IndexedDB and
 * replay (in order) when the connection returns. Server timestamps and the
 * forward-only load lifecycle make replays conflict-safe.
 */

// Type-only imports: erased at compile time, so the server-action modules
// never enter this client bundle — we only borrow their input types.
import type {
  driverAddFacilityNote, driverRequestAdvance, driverRequestTimeOff,
} from "@/app/hub/_actions/driver"
import type { submitDvirAction } from "@/app/hub/_actions/dvir"
import type { fileDriverIncidentReport } from "@/app/hub/_actions/safety"

/**
 * One payload type per intent kind, derived from the replayed action's own
 * input where the action takes an object. Enqueue sites and OfflineSync's
 * replay both compile against this map, so a renamed form field breaks the
 * build instead of surfacing hours later as a failed replay in a dead zone.
 */
export interface IntentPayloads {
  status: { loadId: string }
  stop: { stopId: string; loadId: string; field: "arrived_at" | "departed_at"; at: string }
  ack: { loadId: string }
  "announcement-ack": { announcementId: string; signature: string | null }
  /** Replayed as FormData for driverUploadDocument — keep keys in sync with it. */
  upload: { loadId: string; kind: string; requestId?: string; osd?: 1; amount?: string }
  dvir: Parameters<typeof submitDvirAction>[0]
  incident: Parameters<typeof fileDriverIncidentReport>[0]
  "facility-note": Parameters<typeof driverAddFacilityNote>[0]
  "time-off": Parameters<typeof driverRequestTimeOff>[0]
  advance: Parameters<typeof driverRequestAdvance>[0]
}

export type IntentKind = keyof IntentPayloads

/** Serialized file for offline photo uploads. */
export interface QueuedFile { name: string; type: string; buffer: ArrayBuffer }

/** What callers hand to runOrQueue — kind discriminates the payload type. */
export type PendingIntent = {
  [K in IntentKind]: { kind: K; payload: IntentPayloads[K]; file?: QueuedFile }
}[IntentKind]

/**
 * Bump this when an IntentPayloads shape changes in a way a stale queued row
 * wouldn't survive (renamed/removed/retyped field) — a driver could be parked
 * offline for days, so the app version that replays an intent is often not
 * the one that queued it. Rows stamped with an older version are dropped at
 * replay instead of handed to execute() with a shape it was never built for.
 *
 * v2: "stop" gained a required `at` field (the tap-time timestamp) so a
 * replay hours later still records when the driver actually arrived/departed,
 * not when the queue happened to sync — detention billing runs off this
 * timestamp. A v1 "stop" row has no `at` and must be dropped, not replayed
 * with a stale server-time fallback.
 */
export const QUEUE_SCHEMA_VERSION = 2

// Persisted rows carry whatever shape was current when queued — the typed map
// guards call sites at compile time, not old IndexedDB data at replay.
// schemaVersion is optional: rows queued before this field existed have none,
// and are treated as matching (nothing about the shape changed until v1).
export type QueuedIntent = {
  [K in IntentKind]: {
    id: string
    kind: K
    payload: IntentPayloads[K]
    file?: QueuedFile
    queuedAt: number
    schemaVersion?: number
  }
}[IntentKind]

const DB_NAME = "hauldesk-driver"
const STORE = "queue"

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
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
    // OfflineSync calls into this queue every 30s for the life of a shift.
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
    tx.onabort = () => db.close()
  })
}

export async function enqueueIntent(intent: PendingIntent): Promise<void> {
  const full: QueuedIntent = {
    ...intent,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    queuedAt: Date.now(),
    schemaVersion: QUEUE_SCHEMA_VERSION,
  }
  await withStore("readwrite", (store) => store.add(full))
  window.dispatchEvent(new CustomEvent("hauldesk-queue-changed"))
}

export async function listIntents(): Promise<QueuedIntent[]> {
  const all = await withStore<QueuedIntent[]>("readonly", (store) => store.getAll())
  return all.sort((a, b) => a.queuedAt - b.queuedAt)
}

export async function removeIntent(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id))
  window.dispatchEvent(new CustomEvent("hauldesk-queue-changed"))
}

export async function queueCount(): Promise<number> {
  return withStore<number>("readonly", (store) => store.count())
}

/** Does this error smell like "no signal" rather than a real rejection? */
export function isOfflineError(err: unknown): boolean {
  // Explicit === false: some runtimes (Node 21+) expose navigator without
  // onLine, and "no signal" must never become the default classification.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true
  // An aborted or timed-out request on a moving truck is a connectivity
  // failure, not a rejection — queuing is always safe (replays are
  // conflict-safe), while a hard error loses the driver's tap. AbortError /
  // TimeoutError are DOMExceptions, so match by name rather than instanceof.
  const name = err && typeof err === "object" ? (err as { name?: unknown }).name : undefined
  if (name === "AbortError" || name === "TimeoutError") return true
  const message = err instanceof Error ? err.message : String(err)
  return /fetch failed|failed to fetch|network|load failed|ERR_INTERNET|timed? ?out|ETIMEDOUT|ECONNRESET/i.test(
    message
  )
}

export interface ReplayResult { sent: number; failed: number }

/**
 * Replays queued intents oldest-first (caller passes listIntents()'s output,
 * already sorted). A connectivity error stops the loop immediately so the
 * untouched remainder stays queued in order for the next signal; any other
 * throw drops just that intent so one bad payload can't jam everything
 * queued behind it. Mirrors OfflineSync's toast copy: `sent` update the
 * "N sent" success toast, `failed` the "N couldn't be sent" error toast.
 *
 * A row stamped with a schemaVersion that doesn't match the running app's
 * QUEUE_SCHEMA_VERSION is dropped before execute() ever sees it — it was
 * queued under a payload shape this build no longer knows how to send.
 * Rows with no schemaVersion (queued before the field existed) are treated
 * as current and replayed normally.
 */
export async function replayQueue(
  intents: QueuedIntent[],
  execute: (intent: QueuedIntent) => Promise<{ ok: boolean; error?: string }>
): Promise<ReplayResult> {
  let sent = 0
  let failed = 0
  for (const intent of intents) {
    if (intent.schemaVersion !== undefined && intent.schemaVersion !== QUEUE_SCHEMA_VERSION) {
      console.warn(`offline replay: dropped ${intent.kind} queued under schema v${intent.schemaVersion} (app is v${QUEUE_SCHEMA_VERSION})`)
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
        // otherwise undiagnosable from a CI artifact or a driver's phone.
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
 * Try the action now; if the network is gone, queue it and tell the driver
 * the truth ("saved — sends when you have signal").
 */
export async function runOrQueue<T extends { ok: boolean; error?: string }>(
  intent: PendingIntent,
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
