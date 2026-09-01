"use client"

/**
 * Offline action queue for the office side — a dispatcher running the day
 * from a phone loses signal too. Same engine as the driver queue
 * (../offline/queue-core), own database and change event: sharing the
 * driver's store would hand driver rows to the office execute table, where
 * unknown kinds are silently dropped.
 *
 * Only conflict-safe taps queue. Deliberately excluded:
 * - cancels — a cancel replayed hours later could race an office approval
 *   (the driver queue carves these out for the same reason);
 * - decideAdvanceAction — a money decision must reflect the moment it's
 *   made, not the moment the phone finds signal.
 */
import { createOfflineQueue } from "@/components/hub/offline/queue-core"

export { isOfflineError } from "@/components/hub/offline/queue-core"

export interface OfficeIntentPayloads {
  /** Forward-only NEXT_STATUS makes a late replay conflict-safe. */
  "advance-status": { loadId: string }
  /** Append-only log — replays can only add the note late, never clobber. */
  "check-call": { loadId: string; note: string }
  "task-complete": { taskId: string }
  "task-checklist": { taskId: string; index: number; done: boolean }
  /**
   * `at` is the tap-time, captured on the phone — a replay hours later must
   * record when the truck actually arrived/departed, not when the queue
   * synced, because detention billing runs off it (same rule as the driver
   * queue's "stop" intent; the server distrusts future values).
   */
  "stop-timestamp": { stopId: string; loadId: string; field: "arrived_at" | "departed_at"; at: string }
}

export type OfficeIntentKind = keyof OfficeIntentPayloads

export type OfficePendingIntent = {
  [K in OfficeIntentKind]: { kind: K; payload: OfficeIntentPayloads[K] }
}[OfficeIntentKind]

/**
 * Bump when an OfficeIntentPayloads shape changes in a way a stale queued
 * row wouldn't survive — rows stamped with an older version are dropped at
 * replay instead of handed to execute() with a shape it was never built for.
 */
export const OFFICE_QUEUE_SCHEMA_VERSION = 1

export type OfficeQueuedIntent = {
  [K in OfficeIntentKind]: {
    id: string
    kind: K
    payload: OfficeIntentPayloads[K]
    queuedAt: number
    schemaVersion?: number
  }
}[OfficeIntentKind]

const queue = createOfflineQueue<OfficePendingIntent, OfficeQueuedIntent>({
  dbName: "hauldesk-office",
  changeEvent: "hauldesk-office-queue-changed",
  schemaVersion: OFFICE_QUEUE_SCHEMA_VERSION,
})

export const enqueueIntent = queue.enqueueIntent
export const listIntents = queue.listIntents
export const removeIntent = queue.removeIntent
export const queueCount = queue.queueCount
export const replayQueue = queue.replayQueue
export const runOrQueue = queue.runOrQueue
