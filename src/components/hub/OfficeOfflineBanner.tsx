"use client"

/**
 * The office-side answer to the driver app's OfflineSync chip: an honest
 * banner while the signal is down (the offline shell keeps the last loaded
 * screens readable), a pending count for the taps the office queue saved,
 * and an automatic replay + server-component refresh the moment connectivity
 * returns so nobody dispatches off stale data. Status moves, arrivals and
 * departures, check calls, and task ticks queue (see office/offline-queue.ts
 * for what doesn't, and why); everything else still needs a connection.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CloudOff, RefreshCw } from "lucide-react"
import { listIntents, queueCount, replayQueue } from "@/components/hub/office/offline-queue"
import { executeOfficeIntent } from "@/components/hub/office/execute-office-intent"

export function OfficeOfflineBanner() {
  const router = useRouter()
  const [state, setState] = useState<"online" | "offline" | "reconnecting">("online")
  const [pending, setPending] = useState(0)
  const replaying = useRef(false)

  const refreshCount = useCallback(() => {
    queueCount().then(setPending).catch(() => {})
  }, [])

  const replay = useCallback(async () => {
    if (replaying.current || !navigator.onLine) return
    replaying.current = true
    try {
      const { sent, failed } = await replayQueue(await listIntents(), executeOfficeIntent)
      if (sent > 0) {
        toast.success(`Back online — ${sent} saved update${sent > 1 ? "s" : ""} sent`)
        router.refresh()
      }
      if (failed > 0) {
        toast.error(`${failed} saved update${failed > 1 ? "s" : ""} couldn't be sent — check the record`)
      }
    } finally {
      replaying.current = false
      refreshCount()
    }
  }, [router, refreshCount])

  useEffect(() => {
    // navigator.onLine is unavailable during SSR; this syncs the hydration-safe
    // "online" default to the real value once on the client.
    if (!navigator.onLine) setState("offline")
    const timer = setTimeout(() => {
      refreshCount()
      replay()
    }, 0)
    const onOffline = () => setState("offline")
    const onOnline = () => {
      setState("reconnecting")
      replay()
      router.refresh()
      // router.refresh() has no completion signal; give the refetch a moment
      // before dropping the chip so the transition doesn't flicker.
      setTimeout(() => setState("online"), 1500)
    }
    const onQueueChanged = () => refreshCount()
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    window.addEventListener("hauldesk-office-queue-changed", onQueueChanged)
    const interval = setInterval(() => {
      if (navigator.onLine) replay()
    }, 30_000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("hauldesk-office-queue-changed", onQueueChanged)
    }
  }, [router, replay, refreshCount])

  if (state === "online" && pending === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] inset-x-0 z-50 mx-auto max-w-lg px-4 pt-2"
    >
      <p className="flex items-center gap-2 rounded-card border border-warn bg-surface px-3 py-2 text-body-xs font-semibold text-warn shadow-card">
        {state === "offline" ? (
          <>
            <CloudOff className="h-3.5 w-3.5 shrink-0" />
            {pending > 0
              ? `No signal — ${pending} update${pending > 1 ? "s" : ""} saved, sends automatically`
              : "No signal — showing the last loaded screens. Status moves, arrivals, check calls, and task ticks still save."}
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
            {pending > 0
              ? `Sending ${pending} saved update${pending > 1 ? "s" : ""}…`
              : "Back online — refreshing…"}
          </>
        )}
      </p>
    </div>
  )
}
