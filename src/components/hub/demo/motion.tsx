"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Demo motion toolkit — the difference between a slideshow and a machine
 * that's visibly running: money counts up, clocks tick, the other side
 * types. All compositor/state-cheap; all collapse under reduced motion.
 */

/** Animates a formatted number ("$18,420", "7", "$1.04") counting up on mount. */
export function CountUp({
  value,
  durationMs = 800,
  className,
}: {
  value: string
  durationMs?: number
  className?: string
}) {
  const [display, setDisplay] = useState<string>(() => value.replace(/[0-9]/g, "0"))
  useEffect(() => {
    const match = value.match(/^([^0-9]*)([0-9,]+(?:\.[0-9]+)?)(.*)$/)
    if (!match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value)
      return
    }
    const target = Number(match[2].replace(/,/g, ""))
    const decimals = match[2].includes(".") ? match[2].split(".")[1].length : 0
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const formatted = (target * eased).toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
      setDisplay(`${match[1]}${formatted}${match[3]}`)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])
  return <span className={className}>{display}</span>
}

/** A clock that keeps counting from a base "H:MM:SS" — detention is accruing. */
export function TickingClock({ from, className }: { from: string; className?: string }) {
  const [seconds, setSeconds] = useState(() => {
    const parts = from.split(":").map(Number)
    return parts.reduce((total, part) => total * 60 + part, 0)
  })
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return (
    <span className={className}>
      {h}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  )
}

/** Three bouncing dots — the other side is typing. */
export function TypingDots({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("demo-typing", className)} role="status" aria-label="Typing a reply">
      <i className={dark ? "bg-steel-200" : "bg-fg-3"} />
      <i className={dark ? "bg-steel-200" : "bg-fg-3"} />
      <i className={dark ? "bg-steel-200" : "bg-fg-3"} />
    </span>
  )
}
