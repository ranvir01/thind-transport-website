"use client"

/**
 * Full-screen milestone moment — fires for FIRSTS only (first invoice sent,
 * first payment recorded), once per event type per browser, with an off
 * switch in the avatar menu ("Celebrate milestones"). Routine actions never
 * celebrate; that's what keeps the one moment worth something.
 */
import { useEffect, useRef } from "react"
import { CheckDraw } from "@/components/hub/CheckDraw"
import { isTextEntry, overlayMayTakeFocus } from "@/lib/hub/celebrations"

export function MilestoneMoment({
  title,
  body,
  onDone,
}: {
  title: string
  body: string
  onDone: () => void
}) {
  // Callers pass an inline arrow (`onDone={() => setCelebrating(false)}`), so
  // onDone's identity changes on every parent render. Reading it through a ref
  // keeps the effect below mount-only: with onDone in the dep array the effect
  // re-ran on every render of the screen underneath, which re-pulled focus and
  // restarted the 2.6s timer each time — see the comment in the effect.
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    // Pull keyboard focus off whatever button triggered the moment — otherwise
    // Enter re-activates it behind the overlay (duplicate submit). Blur the
    // trigger rather than focusing the overlay, and do it ONCE: this effect used
    // to re-run on every parent render and grab focus back each time, so the
    // record-payment form sitting beneath the overlay lost the keystrokes typed
    // into it for the full 2.6s. A $2,125.44 remainder landed as $2.00 with a
    // "Payment recorded" toast and no complaint from any layer. Focus on <body>
    // still makes the duplicate submit impossible, and Enter/Space stay
    // neutralized by the keydown handler below while the moment is up.
    //
    // Never take focus off a field the user is TYPING into, though. The moment
    // lands a server round-trip after the click, so it can arrive mid-keystroke,
    // and dropping focus then sends every character that follows to <body> —
    // the same silent truncation, reached by blur instead of by focus-steal.
    // The duplicate-submit hazard this exists for is about buttons.
    if (overlayMayTakeFocus(document.activeElement)) {
      ;(document.activeElement as HTMLElement | null)?.blur()
    }
    const done = () => onDoneRef.current()
    const t = window.setTimeout(done, 2600)
    const onKey = (e: KeyboardEvent) => {
      // Space is a character when focus stayed in a text field — dismissing on
      // it would eat the space instead of typing it. Enter still dismisses
      // there (and is prevented), which is what stops the implicit re-submit.
      if (e.key === " " && isTextEntry(e.target as HTMLElement | null)) return
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        done()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  return (
    <div
      role="status"
      onClick={onDone}
      className="hub-backdrop-enter fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-6"
    >
      <div className="hub-pop-enter flex max-w-xs flex-col items-center rounded-card border border-border bg-surface p-8 text-center shadow-overlay">
        <CheckDraw size={72} />
        <p className="mt-4 text-[18px] font-semibold text-fg">{title}</p>
        <p className="mt-1 text-body-sm text-fg-3">{body}</p>
      </div>
    </div>
  )
}
