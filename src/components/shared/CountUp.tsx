"use client"

/**
 * Count-up number, fired once when the stat scrolls into view.
 *
 * Stats on this site are the thing a driver actually scans for, so they get the
 * one bit of motion the motion spec allows on data (`motion-and-animation`:
 * "count-up on first view only, ≤1.2s"). Everything else about the element is
 * static — the final value is rendered on the server and is what a crawler,
 * a screen reader, and anyone with `prefers-reduced-motion: reduce` sees.
 *
 * Deliberately dependency-free: this is one rAF loop, not a library.
 */

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface CountUpProps {
  /** The real number. Rendered as-is under reduced motion or before hydration. */
  value: number
  /** Digits after the decimal point — 0 for counts, 1–2 for rates. */
  decimals?: number
  prefix?: string
  suffix?: string
  /** Animation length in ms; capped at the 1.2s motion budget. */
  duration?: number
  className?: string
}

const format = (n: number, decimals: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 900,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let frame = 0
    let start = 0
    const ms = Math.min(duration, 1200)

    const run = () => {
      // Ease-out cubic: fast off the line, settles on the real number.
      const tick = (now: number) => {
        if (!start) start = now
        const t = Math.min((now - start) / ms, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(value * eased)
        if (t < 1) frame = requestAnimationFrame(tick)
        else setDisplay(value)
      }
      frame = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setDisplay(0)
            run()
            observer.disconnect() // once, never again
          }
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, duration])

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {format(display, decimals)}
      {suffix}
    </span>
  )
}
