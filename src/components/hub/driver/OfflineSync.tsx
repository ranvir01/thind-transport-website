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
import { listIntents, queueCount, replayQueue } from "./offline-queue"
import { executeIntent } from "./execute-intent"

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
      const { sent, failed } = await replayQueue(intents, executeIntent)
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
            ? "text-[color:var(--driver-accent)]"
            : "border-orange/40 bg-orange/15 text-orange"
        }`}
        // Opacity modifiers silently drop on CSS-var colors (AGENTS.md), so the
        // carrier-accent border/bg mix goes through color-mix() like DriverNav's
        // other --driver-accent surfaces instead of border-[…]/40 bg-[…]/15.
        style={
          online
            ? {
                borderColor: "color-mix(in srgb, var(--driver-accent) 40%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--driver-accent) 15%, transparent)",
              }
            : undefined
        }
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
