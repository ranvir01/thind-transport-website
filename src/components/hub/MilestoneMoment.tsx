"use client"

/**
 * Full-screen milestone moment — fires for FIRSTS only (first invoice sent,
 * first payment recorded), once per event type per browser, with an off
 * switch in the avatar menu ("Celebrate milestones"). Routine actions never
 * celebrate; that's what keeps the one moment worth something.
 */
import { useEffect, useRef } from "react"
import { CheckDraw } from "@/components/hub/CheckDraw"

export function MilestoneMoment({
  title,
  body,
  onDone,
}: {
  title: string
  body: string
  onDone: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Pull keyboard focus off whatever button triggered the moment —
    // otherwise Enter re-activates it behind the overlay (duplicate submit).
    ref.current?.focus()
    const t = window.setTimeout(onDone, 2600)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onDone()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener("keydown", onKey)
    }
  }, [onDone])

  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      onClick={onDone}
      className="hub-backdrop-enter fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-6 outline-none"
    >
      <div className="hub-pop-enter flex max-w-xs flex-col items-center rounded-card border border-border bg-surface p-8 text-center shadow-overlay">
        <CheckDraw size={72} />
        <p className="mt-4 text-[18px] font-semibold text-fg">{title}</p>
        <p className="mt-1 text-body-sm text-fg-3">{body}</p>
      </div>
    </div>
  )
}
