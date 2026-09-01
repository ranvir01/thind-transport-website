"use client"

/**
 * Offline action queue for the driver app. Drivers lose signal constantly at
 * rural shippers — taps must never be lost. Intents persist in IndexedDB and
 * replay (in order) when the connection returns. Server timestamps and the
 * forward-only load lifecycle make replays conflict-safe.
 *
 * The engine lives in ../offline/queue-core (shared with the office queue);
 * this module keeps the driver's intent types and its long-standing database
 * ("hauldesk-driver") and change event ("hauldesk-queue-changed") — both are
 * load-bearing names: live phones hold queued rows in that database, and the
 * driver e2e smoke opens it by name.
 */

// Type-only imports: erased at compile time, so the server-action modules
// never enter this client bundle — we only borrow their input types.
import type {
  driverAddFacilityNote, driverRequestAdvance, driverRequestTimeOff,
} from "@/app/hub/_actions/driver"
import type { submitDvirAction } from "@/app/hub/_actions/dvir"
import type { fileDriverIncidentReport } from "@/app/hub/_actions/safety"
import { createOfflineQueue, type QueuedFile } from "@/components/hub/offline/queue-core"

export { isOfflineError, type QueuedFile, type ReplayResult } from "@/components/hub/offline/queue-core"

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

const queue = createOfflineQueue<PendingIntent, QueuedIntent>({
  dbName: "hauldesk-driver",
  changeEvent: "hauldesk-queue-changed",
  schemaVersion: QUEUE_SCHEMA_VERSION,
})

export const enqueueIntent = queue.enqueueIntent
export const listIntents = queue.listIntents
export const removeIntent = queue.removeIntent
export const queueCount = queue.queueCount
export const replayQueue = queue.replayQueue
export const runOrQueue = queue.runOrQueue
