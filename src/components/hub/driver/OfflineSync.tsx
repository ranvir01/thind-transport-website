"use client"

/**
 * Replays queued driver actions when the signal returns, and shows an honest
 * "waiting to send" strip while anything is pending. Mounted in the driver
 * layout so it works on every screen.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CloudOff, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
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
    // A full-width strip docked directly under the header (56px + the notch
    // inset the header pads itself by). Raised surface + strong hairline so it
    // separates from the page without a blur — one frosted surface per
    // scroller, and the tab bar has it. The offline tone is orange-300: the
    // brand red (#E0392F) sits at ~3.7:1 on these surfaces and fails AA as
    // text; the "sending" tone stays the carrier's --driver-accent, which is
    // resolved to ≥4.5:1 on the dark card (portal/accent.ts).
    <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30 border-b border-driver-border-strong bg-driver-surface-2">
      <p
        className={cn(
          "mx-auto flex min-h-[44px] w-full max-w-lg items-center gap-2 rounded-none border-l-2 py-2 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] text-[13px] font-semibold",
          online
            ? "border-l-[color:var(--driver-accent)] text-[color:var(--driver-accent)]"
            : "border-l-orange-300 text-orange-300"
        )}
      >
        {online ? (
          <RefreshCw className="h-4 w-4 shrink-0 motion-safe:animate-spin" />
        ) : (
          <CloudOff className="h-4 w-4 shrink-0" />
        )}
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
