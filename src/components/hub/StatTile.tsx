"use client"

/**
 * Today-screen stat tile — the 2×2 data-above-the-fold grid.
 * 30px semibold value (mono for money), 13px label, tap-through, tone badge
 * only when the number demands attention, count-up on first paint only.
 */
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (target === 0) {
      setValue(0)
      return
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}

export function StatTile({
  label,
  value,
  money = false,
  href,
  tone = "neutral",
  toneLabel,
  zeroHint,
}: {
  label: string
  /** Raw number — cents when money, count otherwise. */
  value: number
  money?: boolean
  href: string
  /** Badge tone; only rendered when value > 0 and tone !== "neutral". */
  tone?: "neutral" | "warn" | "bad" | "ok" | "accent"
  toneLabel?: string
  /** Quiet one-liner shown instead of a badge when the value is zero. */
  zeroHint?: string
}) {
  const animated = useCountUp(value)
  const display = money
    ? `$${Math.round(animated / 100).toLocaleString("en-US")}`
    : animated.toLocaleString("en-US")

  const showBadge = value > 0 && tone !== "neutral" && toneLabel

  return (
    <Link
      href={href}
      className="block rounded-card border border-border bg-surface p-4 shadow-card hover:bg-hover"
    >
      <span className="block text-[13px] font-medium text-fg-3">{label}</span>
      <span
        className={cn(
          "mt-1 block text-[30px] font-semibold leading-tight tracking-tight tabular-nums text-fg",
          money && "font-mono"
        )}
      >
        {display}
      </span>
      {showBadge ? (
        <span
          className={cn(
            "mt-1.5 inline-flex rounded-pill px-2 py-0.5 text-[11px] font-semibold",
            tone === "warn" && "bg-warn-soft text-warn",
            tone === "bad" && "bg-bad-soft text-bad",
            tone === "ok" && "bg-ok-soft text-ok",
            tone === "accent" && "bg-accent-soft text-accent-text"
          )}
        >
          {toneLabel}
        </span>
      ) : value === 0 && zeroHint ? (
        <span className="mt-1.5 block text-[12px] text-fg-3">{zeroHint}</span>
      ) : null}
    </Link>
  )
}
