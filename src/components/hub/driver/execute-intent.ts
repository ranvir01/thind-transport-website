/**
 * Dispatches a queued intent to the server action that sends it, translating
 * the typed payload into whatever shape that action expects. Extracted from
 * OfflineSync so the dispatch table is testable without mounting a React
 * component (mirrors replayQueue's extraction from the same file).
 */
import type { QueuedIntent } from "./offline-queue"
import {
  driverAcknowledgeAnnouncement, driverAcknowledgeDispatch, driverAddFacilityNote, driverAdvanceStatus,
  driverRequestAdvance, driverRequestTimeOff, driverStopTimestamp, driverUploadDocument,
} from "@/app/hub/_actions/driver"
import { submitDvirAction } from "@/app/hub/_actions/dvir"
import { fileDriverIncidentReport } from "@/app/hub/_actions/safety"

// intent.kind narrows intent.payload via IntentPayloads (offline-queue.ts) —
// no casts, so a drifted enqueue site fails this file's build, not a replay.
export async function executeIntent(intent: QueuedIntent): Promise<{ ok: boolean; error?: string }> {
  switch (intent.kind) {
    case "status":
      return driverAdvanceStatus(intent.payload.loadId)
    case "stop":
      // at was stamped when the driver tapped, so a replay hours later still
      // bills detention off the real dwell time (mirrors "incident" below).
      return driverStopTimestamp(intent.payload.stopId, intent.payload.loadId, intent.payload.field, intent.payload.at)
    case "ack":
      return driverAcknowledgeDispatch(intent.payload.loadId)
    case "announcement-ack":
      return driverAcknowledgeAnnouncement(intent.payload.announcementId, intent.payload.signature)
    case "upload": {
      const formData = new FormData()
      formData.set("load_id", intent.payload.loadId)
      formData.set("kind", intent.payload.kind)
      if (intent.payload.requestId) formData.set("request_id", intent.payload.requestId)
      if (intent.payload.osd) formData.set("osd", "1")
      if (intent.payload.amount) formData.set("amount", intent.payload.amount)
      if (intent.file) {
        formData.set("file", new File([intent.file.buffer], intent.file.name, { type: intent.file.type }))
      }
      return driverUploadDocument(formData)
    }
    case "dvir":
      return submitDvirAction(intent.payload)
    case "incident":
      // occurredAt was stamped when the driver hit "File the report", so a
      // replay hours later still records the true time of the incident.
      return fileDriverIncidentReport(intent.payload)
    case "facility-note":
      // Notes are additive and conflict-safe — replayed hours later they still
      // help the next driver at that dock.
      return driverAddFacilityNote(intent.payload)
    case "time-off":
      return driverRequestTimeOff(intent.payload)
    case "advance":
      return driverRequestAdvance(intent.payload)
    default:
      // Unreachable by type, reachable by data: an intent queued by an older
      // app version whose kind no longer exists. Drop it rather than jam the
      // queue behind it.
      return { ok: true }
  }
}
