"use client"

/**
 * Shift Mode's heartbeat: while a sandbox tab is visible, POST the tick
 * endpoint every ~25s (jittered so parallel tabs drift apart — the server's
 * advisory lock and 20s gate make extras harmless). Returning to a hidden
 * tab ticks immediately — that's the catch-up trigger after a gap.
 *
 * Etiquette (review E2/A6): screens refresh only when the world actually
 * advanced, and NEVER while the user is mid-thought — an open dialog/sheet
 * or a focused input defers the refresh to the next beat, so a dispatcher
 * mid-booking never has the board yanked. After ~30 min without a
 * pointerdown/keydown the ticker stands down entirely (a forgotten
 * overnight tab stops churning the database) and resumes on the next
 * interaction. 401/403 mean this tab shouldn't be ticking — stand down.
 */
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const IDLE_STOP_MS = 30 * 60_000

function refreshIsSafe(): boolean {
  const el = document.activeElement
  if (
    el instanceof HTMLElement &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)
  ) {
    return false
  }
  // Any open dialog/sheet (native or ARIA) holds the world still on screen.
  if (document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]')) return false
  return true
}

export function SimTicker() {
  const router = useRouter()
  const failures = useRef(0)
  const inFlight = useRef(false)
  const lastInteraction = useRef(Date.now())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const beat = async () => {
      if (disposed || document.visibilityState !== "visible") return
      if (inFlight.current || failures.current >= 99) return
      if (Date.now() - lastInteraction.current > IDLE_STOP_MS) return // idle-stop (A6)
      inFlight.current = true
      try {
        const res = await fetch("/api/hub/sandbox/tick", { method: "POST" })
        if (res.status === 401 || res.status === 403) {
          failures.current = 99 // not this tab's world to run — stand down for the visit
          return
        }
        const data = (await res.json()) as { advanced?: boolean }
        failures.current = 0
        if (data.advanced && refreshIsSafe()) router.refresh()
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
    const onInteract = () => {
      const wasIdle = Date.now() - lastInteraction.current > IDLE_STOP_MS
      lastInteraction.current = Date.now()
      if (wasIdle) void beat() // waking from idle-stop catches the world up now
    }

    void beat() // first paint ticks right away — this is the catch-up path
    schedule()
    document.addEventListener("visibilitychange", onVisible)
    document.addEventListener("pointerdown", onInteract, { passive: true })
    document.addEventListener("keydown", onInteract, { passive: true })
    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      document.removeEventListener("pointerdown", onInteract)
      document.removeEventListener("keydown", onInteract)
    }
  }, [router])

  return null
}
