"use client"

/**
 * Scroll reveal — the framer-motion replacement for the marketing site.
 *
 * framer-motion was imported by 15 marketing components to do essentially one
 * thing: fade-and-rise once when a section scrolls into view. That cost ~40KB
 * gzipped and, worse, forced every one of those files to be a client component.
 * This does the same job with an IntersectionObserver and a CSS transition, and
 * because only this wrapper is client-side, the sections it wraps can stay
 * server components — their markup ships as HTML instead of JS.
 *
 * Deliberately constrained per docs/design/DIRECTION.md §5: 12px of travel,
 * 200ms, fires once, never re-animates on scroll-up. Motion is punctuation
 * here, not the point — the one orchestrated moment lives in the hero.
 */

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface RevealProps {
  children: React.ReactNode
  /** Stagger index — each step adds one `fast` duration of delay (120ms). */
  index?: number
  /** Element to render. Sections should pass their own semantic tag. */
  as?: "div" | "li" | "section"
  className?: string
}

export function Reveal({ children, index = 0, as = "div", className }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect the user's setting before doing any work: reduced motion means
    // the element is simply visible, with no observer and no transition.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true)
      return
    }

    // Already in view on load (above the fold) — show immediately rather than
    // waiting for a scroll that may never come.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect() // fire once, never re-run
          }
        }
      },
      // Start slightly before the element reaches the viewport so the motion
      // finishes about when it's actually readable.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Tag = as as React.ElementType

  return (
    <Tag
      ref={ref}
      // Tokenised: 200ms `base` duration on the `entrance` curve, 12px travel.
      className={cn(
        "motion-safe:transition-[opacity,transform] motion-safe:duration-base motion-safe:ease-entrance",
        shown ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-3",
        className
      )}
      style={index ? { transitionDelay: `${index * 120}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
