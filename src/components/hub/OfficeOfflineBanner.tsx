"use client"

/**
 * The office-side answer to the driver app's OfflineSync chip: an honest
 * banner when the signal drops (the offline shell keeps the last loaded
 * screens readable), and an automatic server-component refresh the moment
 * connectivity returns so nobody dispatches off stale data. Office actions
 * aren't queued offline — this is read-only survival, and the banner says so.
 */
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CloudOff, RefreshCw } from "lucide-react"

export function OfficeOfflineBanner() {
  const router = useRouter()
  const [state, setState] = useState<"online" | "offline" | "reconnecting">("online")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator.onLine is unavailable during SSR; this syncs the hydration-safe "online" default to the real value once on the client.
    if (!navigator.onLine) setState("offline")
    const onOffline = () => setState("offline")
    const onOnline = () => {
      setState("reconnecting")
      router.refresh()
      // router.refresh() has no completion signal; give the refetch a moment
      // before dropping the chip so the transition doesn't flicker.
      setTimeout(() => setState("online"), 1500)
    }
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [router])

  if (state === "online") return null

  return (
    <div className="fixed top-14 inset-x-0 z-50 mx-auto max-w-lg px-4 pt-2">
      <p className="flex items-center gap-2 rounded-card border border-warn bg-surface px-3 py-2 text-body-xs font-semibold text-warn shadow-card">
        {state === "offline" ? (
          <>
            <CloudOff className="h-3.5 w-3.5 shrink-0" />
            No signal — showing the last loaded screens. Changes need a connection.
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
            Back online — refreshing…
          </>
        )}
      </p>
    </div>
  )
}
