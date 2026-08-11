"use client"

/**
 * Shift Mode's heartbeat: while a sandbox tab is visible, POST the tick
 * endpoint every ~25s (jittered so parallel tabs drift apart — the server's
 * advisory lock and 20s gate make extras harmless). Returning to a hidden
 * tab ticks immediately — that's the catch-up trigger after a gap. Screens
 * refresh only when the world actually advanced, and the ticker backs off
 * after repeated failures instead of hammering a broken endpoint.
 */
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export function SimTicker() {
  const router = useRouter()
  const failures = useRef(0)
  const inFlight = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const beat = async () => {
      if (disposed || document.visibilityState !== "visible") return
      if (inFlight.current) return
      inFlight.current = true
      try {
        const res = await fetch("/api/hub/sandbox/tick", { method: "POST" })
        if (res.status === 403) {
          failures.current = 99 // sandbox disabled — stand down for this visit
          return
        }
        const data = (await res.json()) as { advanced?: boolean }
        failures.current = 0
        if (data.advanced) router.refresh()
      } catch {
        failures.current += 1
      } finally {
        inFlight.current = false
      }
    }

    const schedule = () => {
      if (disposed) return
      const backoff = Math.min(failures.current, 4)
      const delay = (25_000 + (Math.random() - 0.5) * 6_000) * (1 + backoff)
      timer = setTimeout(async () => {
        await beat()
        schedule()
      }, delay)
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void beat()
    }

    void beat() // first paint ticks right away — this is the catch-up path
    schedule()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [router])

  return null
}
