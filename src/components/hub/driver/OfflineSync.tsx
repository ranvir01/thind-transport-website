"use client"

/**
 * Replays queued driver actions when the signal returns, and shows an honest
 * "waiting to send" chip while anything is pending. Mounted in the driver
 * layout so it works on every screen.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CloudOff, RefreshCw } from "lucide-react"
import {
  listIntents, queueCount, replayQueue, type QueuedIntent,
} from "./offline-queue"
import {
  driverAcknowledgeAnnouncement, driverAcknowledgeDispatch, driverAddFacilityNote, driverAdvanceStatus,
  driverRequestAdvance, driverRequestTimeOff, driverStopTimestamp, driverUploadDocument,
} from "@/app/hub/_actions/driver"
import { submitDvirAction } from "@/app/hub/_actions/dvir"
import { fileDriverIncidentReport } from "@/app/hub/_actions/safety"

// intent.kind narrows intent.payload via IntentPayloads (offline-queue.ts) —
// no casts, so a drifted enqueue site fails this file's build, not a replay.
async function execute(intent: QueuedIntent): Promise<{ ok: boolean; error?: string }> {
  switch (intent.kind) {
    case "status":
      return driverAdvanceStatus(intent.payload.loadId)
    case "stop":
      return driverStopTimestamp(intent.payload.stopId, intent.payload.loadId, intent.payload.field)
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

export function OfflineSync() {
  const router = useRouter()
  const [pending, setPending] = useState(0)
  const [online, setOnline] = useState(true)
  const replaying = useRef(false)

  const refreshCount = useCallback(() => {
    queueCount().then(setPending).catch(() => {})
  }, [])

  const replay = useCallback(async () => {
    if (replaying.current || !navigator.onLine) return
    replaying.current = true
    try {
      const intents = await listIntents()
      const { sent, failed } = await replayQueue(intents, execute)
      if (sent > 0) {
        toast.success(`Back online — ${sent} update${sent > 1 ? "s" : ""} sent to the office`)
        router.refresh()
      }
      if (failed > 0) {
        toast.error(`${failed} saved update${failed > 1 ? "s" : ""} couldn't be sent — check with the office`)
      }
    } finally {
      replaying.current = false
      refreshCount()
    }
  }, [router, refreshCount])

  useEffect(() => {
    setOnline(navigator.onLine)
    const timer = setTimeout(() => {
      refreshCount()
      replay()
    }, 0)
    const onOnline = () => {
      setOnline(true)
      replay()
    }
    const onOffline = () => setOnline(false)
    const onChange = () => refreshCount()
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    window.addEventListener("hauldesk-queue-changed", onChange)
    const interval = setInterval(() => {
      if (navigator.onLine) replay()
    }, 30_000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("hauldesk-queue-changed", onChange)
    }
  }, [replay, refreshCount])

  if (online && pending === 0) return null

  return (
    <div className="fixed top-14 inset-x-0 z-30 mx-auto max-w-lg px-4 pt-2">
      <p
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-body-xs font-semibold backdrop-blur-sm ${
          online
            ? "border-gold/40 bg-gold/15 text-gold"
            : "border-orange/40 bg-orange/15 text-orange"
        }`}
      >
        {online ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudOff className="h-3.5 w-3.5" />}
        {online
          ? `Sending ${pending} saved update${pending > 1 ? "s" : ""}…`
          : pending > 0
            ? `No signal — ${pending} update${pending > 1 ? "s" : ""} saved, sends automatically`
            : // Cancels are the one deliberate exception to the queue (a cancel
              // replayed hours later could race an office approval) — the
              // banner must not promise they save.
              "No signal — your taps still save and send when you're back; cancels wait for signal"}
      </p>
    </div>
  )
}
