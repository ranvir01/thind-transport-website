"use client"

/**
 * In-app help (Phase 7): plain-language explainers with the regulation cite
 * where one exists — so a brand-new carrier never needs a training manual.
 */
import { useEffect, useRef, useState } from "react"
import { HelpCircle } from "lucide-react"

export function HelpTip({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={`What is ${title}?`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-3 hover:text-accent-text"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open ? (
        <span className="absolute left-1/2 top-8 z-50 w-[min(86vw,320px)] -translate-x-1/2 rounded-card border border-border bg-surface p-3 shadow-raised">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-accent-text">{title}</span>
          <span className="mt-1 block text-body-xs leading-relaxed text-fg-2">{children}</span>
        </span>
      ) : null}
    </span>
  )
}
