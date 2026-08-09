"use client"

/**
 * Header avatar menu — user identity, appearance, celebrations switch, and
 * sign-out in one place. Replaces the row of three bordered header squares
 * (palette / bell / sign-out); only the bell stays exposed in the header.
 */
import { useEffect, useRef, useState } from "react"
import { signOut } from "next-auth/react"
import { Check, LogOut, Moon, PartyPopper, Sun } from "lucide-react"
import { clearShellCache } from "@/lib/hub/pwa"
import {
  APPEARANCE_LABELS,
  applyAppearance,
  readAppearance,
  type HubAccentTheme,
  type HubColorMode,
} from "@/lib/hub/appearance"
import { celebrationsEnabled, setCelebrationsEnabled } from "@/lib/hub/celebrations"
import { cn } from "@/lib/utils"

export function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<HubColorMode>(() => readAppearance().mode)
  const [theme, setTheme] = useState<HubAccentTheme>(() => readAppearance().theme)
  const [celebrate, setCelebrate] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCelebrate(celebrationsEnabled())
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const initial = (name.trim()[0] ?? "U").toUpperCase()

  const pickMode = (next: HubColorMode) => {
    setMode(next)
    applyAppearance(next, theme)
  }
  const pickTheme = (next: HubAccentTheme) => {
    setTheme(next)
    applyAppearance(mode, next)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Account and appearance"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-control text-fg-2 hover:bg-hover"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[12px] font-bold text-fg">
          {initial}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 animate-dropdown-in rounded-card border border-border bg-surface p-1.5 shadow-raised"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-fg">{name}</p>
            <p className="text-[11px] text-fg-3">{role}</p>
          </div>
          <div className="my-1 border-t border-border" />

          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-3">
            Appearance
          </p>
          <div className="mb-1 grid grid-cols-2 gap-1 px-1.5">
            {(["light", "dark"] as HubColorMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pickMode(m)}
                className={cn(
                  "flex min-h-[38px] items-center justify-center gap-1.5 rounded-control text-[13px] font-medium",
                  mode === m ? "bg-accent-soft text-accent-text" : "text-fg-2 hover:bg-hover"
                )}
              >
                {m === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {m === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
          <div className="px-1.5">
            {(["indigo", "teal", "ink"] as HubAccentTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pickTheme(t)}
                className={cn(
                  "flex w-full min-h-[38px] items-center justify-between rounded-control px-2 text-[13px]",
                  theme === t ? "bg-accent-soft font-semibold text-accent-text" : "text-fg-2 hover:bg-hover"
                )}
              >
                {APPEARANCE_LABELS[t]}
                {theme === t ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            ))}
          </div>

          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={celebrate}
            onClick={() => {
              const next = !celebrate
              setCelebrate(next)
              setCelebrationsEnabled(next)
            }}
            className="flex w-full min-h-[40px] items-center justify-between rounded-control px-2.5 text-sm text-fg-2 hover:bg-hover"
          >
            <span className="flex items-center gap-2.5">
              <PartyPopper className="h-4 w-4 text-fg-3" /> Celebrate milestones
            </span>
            <span
              aria-hidden
              className={cn(
                "relative h-5 w-9 rounded-pill transition-colors",
                celebrate ? "bg-accent" : "bg-surface-2 border border-border-strong"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-card transition-transform",
                  celebrate ? "translate-x-[18px]" : "translate-x-0.5"
                )}
              />
            </span>
          </button>

          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              clearShellCache()
              signOut({ callbackUrl: "/hub/login" })
            }}
            className="flex w-full min-h-[40px] items-center gap-2.5 rounded-control px-2.5 text-sm font-medium text-fg-2 hover:bg-hover hover:text-fg"
          >
            <LogOut className="h-4 w-4 text-fg-3" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
