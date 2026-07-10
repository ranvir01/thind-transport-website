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
  isOfflineError, listIntents, queueCount, removeIntent, type QueuedIntent,
} from "./offline-queue"
import {
  driverAcknowledgeAnnouncement, driverAcknowledgeDispatch, driverAdvanceStatus, driverStopTimestamp,
  driverUploadDocument,
} from "@/app/hub/_actions/driver"
import { submitDvirAction } from "@/app/hub/_actions/dvir"

async function execute(intent: QueuedIntent): Promise<{ ok: boolean; error?: string }> {
  switch (intent.kind) {
    case "status":
      return driverAdvanceStatus(String(intent.payload.loadId))
    case "stop":
      return driverStopTimestamp(
        String(intent.payload.stopId),
        String(intent.payload.loadId),
        intent.payload.field as "arrived_at" | "departed_at"
      )
    case "ack":
      return driverAcknowledgeDispatch(String(intent.payload.loadId))
    case "announcement-ack":
      return driverAcknowledgeAnnouncement(
        String(intent.payload.announcementId),
        intent.payload.signature ? String(intent.payload.signature) : null
      )
    case "upload": {
      const formData = new FormData()
      formData.set("load_id", String(intent.payload.loadId))
      formData.set("kind", String(intent.payload.kind))
      if (intent.payload.requestId) formData.set("request_id", String(intent.payload.requestId))
      if (intent.payload.osd) formData.set("osd", "1")
      if (intent.payload.amount) formData.set("amount", String(intent.payload.amount))
      if (intent.file) {
        formData.set("file", new File([intent.file.buffer], intent.file.name, { type: intent.file.type }))
      }
      return driverUploadDocument(formData)
    }
    case "dvir":
      return submitDvirAction(intent.payload as Parameters<typeof submitDvirAction>[0])
    default:
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
      let sent = 0
      let failed = 0
      for (const intent of intents) {
        try {
          const result = await execute(intent)
          // Real rejections (e.g. "not your load") drop the intent too —
          // retrying forever would be worse than telling the office.
          await removeIntent(intent.id)
          if (result.ok) sent++
        } catch (err) {
          if (isOfflineError(err)) break // still offline — try again on the next signal
          // A non-network throw (bad payload, server exception) isn't going to
          // fix itself on retry — drop it so it can't jam every intent queued
          // after it, since replay always starts from the oldest.
          await removeIntent(intent.id)
          failed++
        }
      }
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
            : "No signal — your taps still save and send when you're back"}
      </p>
    </div>
  )
}
