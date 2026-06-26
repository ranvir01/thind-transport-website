"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Moon, Palette, Sun } from "lucide-react"
import {
  APPEARANCE_LABELS,
  applyAppearance,
  readAppearance,
  type HubAccentTheme,
  type HubColorMode,
} from "@/lib/hub/appearance"
import { cn } from "@/lib/utils"

export function HubAppearanceMenu() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<HubColorMode>("light")
  const [theme, setTheme] = useState<HubAccentTheme>("indigo")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const current = readAppearance()
    setMode(current.mode)
    setTheme(current.theme)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const pick = (nextMode: HubColorMode, nextTheme: HubAccentTheme) => {
    setMode(nextMode)
    setTheme(nextTheme)
    applyAppearance(nextMode, nextTheme)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Appearance"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-control border border-border-strong bg-surface text-fg-2 hover:bg-hover"
      >
        <Palette className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-card border border-border bg-surface p-2 shadow-card">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-fg-3">Mode</p>
          <div className="grid grid-cols-2 gap-1 mb-2">
            {(["light", "dark"] as HubColorMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pick(m, theme)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-control px-2 py-2 text-sm font-medium",
                  mode === m ? "bg-accent-soft text-accent-text" : "hover:bg-hover text-fg-2"
                )}
              >
                {m === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {m === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-fg-3">Accent</p>
          <div className="space-y-0.5">
            {(["indigo", "teal", "ink"] as HubAccentTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pick(mode, t)}
                className={cn(
                  "flex w-full items-center justify-between rounded-control px-2 py-2 text-sm",
                  theme === t ? "bg-accent-soft text-accent-text font-semibold" : "hover:bg-hover text-fg-2"
                )}
              >
                {APPEARANCE_LABELS[t]}
                {theme === t ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
