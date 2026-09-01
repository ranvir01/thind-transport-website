"use client"

/**
 * The office replay dispatch table, mirroring driver/execute-intent.ts:
 * extracted so a drifted intent → action mapping fails a fast unit test
 * instead of surfacing as a silently-wrong replay in the field. Every action
 * re-runs its own permission checks server-side, so a permission revoked
 * between queue and replay comes back {ok:false} and surfaces in the
 * "couldn't be sent" toast.
 */
import { advanceLoadStatusAction, logCheckCallAction, stopTimestampAction } from "@/app/hub/_actions/loads"
import { completeTaskAction, toggleChecklistAction } from "@/app/hub/_actions/tasks"
import type { OfficeQueuedIntent } from "./offline-queue"

export async function executeOfficeIntent(
  intent: OfficeQueuedIntent
): Promise<{ ok: boolean; error?: string }> {
  switch (intent.kind) {
    case "advance-status":
      return advanceLoadStatusAction(intent.payload.loadId)
    case "check-call":
      return logCheckCallAction(intent.payload.loadId, intent.payload.note)
    case "task-complete":
      return completeTaskAction(intent.payload.taskId)
    case "task-checklist":
      return toggleChecklistAction(intent.payload.taskId, intent.payload.index, intent.payload.done)
    case "stop-timestamp":
      return stopTimestampAction(
        intent.payload.stopId,
        intent.payload.loadId,
        intent.payload.field,
        intent.payload.at
      )
    default:
      // An unknown kind is a row from a future build — drop it rather than
      // retry forever (matches the driver table's stance).
      return { ok: true }
  }
}
