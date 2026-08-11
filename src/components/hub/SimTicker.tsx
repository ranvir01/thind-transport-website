"use client"

/**
 * Shift Mode's heartbeat: while a sandbox tab is visible, POST the tick
 * endpoint every ~25s (jittered so parallel tabs drift apart — the server's
 * advisory lock and 20s gate make extras harmless). Returning to a hidden
 * tab ticks immediately — that's the catch-up trigger after a gap.
 *
 * The decisions live in sandbox-ticker-policy.ts (pure, unit-tested); this
 * component is the DOM half: listeners, timers, fetch, refresh.
 */
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  failuresAfter,
  nextDelayMs,
  shouldBeat,
  shouldRefresh,
  TICKER,
} from "@/lib/hub/sandbox-ticker-policy"

/** Is the user mid-thought? (open dialog/sheet, or typing into a field) */
function screenIsBusy(): { dialogOpen: boolean; inputFocused: boolean } {
  const el = document.activeElement
  const inputFocused =
    el instanceof HTMLElement &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)
  const dialogOpen = Boolean(
    document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]')
  )
  return { dialogOpen, inputFocused }
}

export function SimTicker() {
  const router = useRouter()
  const failures = useRef(0)
  const inFlight = useRef(false)
  const lastInteraction = useRef(Date.now())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const beat = async ({ bypassIdle = false } = {}) => {
      if (disposed) return
      const ctx = {
        visible: document.visibilityState === "visible",
        inFlight: inFlight.current,
        failures: failures.current,
        idleForMs: Date.now() - lastInteraction.current,
        bypassIdle,
      }
      if (!shouldBeat(ctx)) return
      inFlight.current = true
      // A stalled connection must not wedge the heartbeat forever.
      const abort = new AbortController()
      const timeout = setTimeout(() => abort.abort(), TICKER.requestTimeoutMs)
      try {
        const res = await fetch("/api/hub/sandbox/tick", { method: "POST", signal: abort.signal })
        failures.current = failuresAfter(failures.current, { status: res.status })
        if (!res.ok) return
        const data = (await res.json()) as { advanced?: boolean }
        if (shouldRefresh({ advanced: Boolean(data.advanced), ...screenIsBusy() })) router.refresh()
      } catch {
        failures.current = failuresAfter(failures.current, { networkError: true })
      } finally {
        clearTimeout(timeout)
        inFlight.current = false
      }
    }

    const schedule = () => {
      if (disposed) return
      timer = setTimeout(async () => {
        await beat()
        schedule()
      }, nextDelayMs(failures.current, Math.random()))
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      // Coming back to the tab counts as presence: re-arm the idle window,
      // then tick regardless of how long it was hidden.
      lastInteraction.current = Date.now()
      void beat({ bypassIdle: true })
    }
    const onInteract = () => {
      const wasIdle = Date.now() - lastInteraction.current > TICKER.idleStopMs
      lastInteraction.current = Date.now()
      if (wasIdle) void beat() // waking from idle-stop catches the world up now
    }

    void beat({ bypassIdle: true }) // first paint ticks right away — the catch-up path
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
