"use client"

/**
 * Animated checkmark — stroke draws itself on mount (import success,
 * milestone moments). Pure CSS animation (.hub-check-draw), collapses to a
 * static check under prefers-reduced-motion via the global reduce block.
 */
import { cn } from "@/lib/utils"

export function CheckDraw({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-ok-soft text-ok",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 12.5l5.5 5.5L20 6.5" pathLength={1} className="hub-check-draw" />
      </svg>
    </span>
  )
}
