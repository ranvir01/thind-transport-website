"use client"

/**
 * Header avatar menu — user identity, appearance, celebrations switch, and
 * sign-out in one place. Replaces the row of three bordered header squares
 * (palette / bell / sign-out); only the bell stays exposed in the header.
 */
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { Check, LogOut, MonitorDown, PartyPopper } from "lucide-react"
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

const COLOR_MODES: readonly HubColorMode[] = ["light", "dark"]
const ACCENT_THEMES: readonly HubAccentTheme[] = ["indigo", "teal", "ink"]
const MODE_LABELS: Record<HubColorMode, string> = { light: "Light", dark: "Dark" }

/* Preview swatches paint themselves FROM the tokens instead of from copies.
 * Every mode/theme block in hub-theme.css is scoped by attribute
 * ([data-app="hauldesk"][data-mode="dark"], :where(…[data-theme="teal"])), so a
 * nested span carrying the attributes of the choice being OFFERED re-derives
 * --bg / --text / --accent for its own subtree — the swatch shows what that
 * choice would look like while the menu around it stays in the live
 * appearance. Nothing reads [data-app] below <html> (appearance.ts:87,
 * hub/layout.tsx boot script), so the nested copy is inert. The previous
 * hardcoded hex could drift from the themes it claimed to show, and was ten of
 * token-lint's hub violations. */

/**
 * Radiogroup keyboard contract: arrows move AND select, focus follows the
 * checked radio (roving tabindex — only the checked one is in the tab order).
 */
function radioKeyNav<T extends string>(
  e: React.KeyboardEvent<HTMLButtonElement>,
  options: readonly T[],
  current: T,
  pick: (next: T) => void
) {
  const i = options.indexOf(current)
  let next: number | null = null
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % options.length
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + options.length) % options.length
  if (next === null) return
  e.preventDefault()
  pick(options[next]!)
  const radios = e.currentTarget.closest('[role="radiogroup"]')?.querySelectorAll<HTMLElement>('[role="radio"]')
  radios?.[next]?.focus()
}

export function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<HubColorMode>(() => readAppearance().mode)
  const [theme, setTheme] = useState<HubAccentTheme>(() => readAppearance().theme)
  const [celebrate, setCelebrate] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Defer: celebrationsEnabled() reads localStorage; keep SSR default (true) until after paint.
    queueMicrotask(() => setCelebrate(celebrationsEnabled()))
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
          <div role="radiogroup" aria-label="Color mode" className="mb-1 grid grid-cols-2 gap-1 px-1.5">
            {COLOR_MODES.map((m) => {
              const checked = mode === m
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  onClick={() => pickMode(m)}
                  onKeyDown={(e) => radioKeyNav(e, COLOR_MODES, mode, pickMode)}
                  className={cn(
                    "flex min-h-[38px] items-center justify-center gap-2 rounded-control text-[13px] font-medium",
                    checked ? "bg-accent-soft text-accent-text" : "text-fg-2 hover:bg-hover"
                  )}
                >
                  {/* 20×14 page preview: that mode's own --bg ground with a
                      --text bar, re-derived by the data-mode it carries. */}
                  <span
                    aria-hidden
                    data-app="hauldesk"
                    data-mode={m}
                    className="relative h-3.5 w-5 shrink-0 overflow-hidden border border-border-control bg-bg"
                  >
                    <span className="absolute inset-x-[3px] top-[3px] h-[2px] bg-fg" />
                  </span>
                  {MODE_LABELS[m]}
                </button>
              )
            })}
          </div>
          <div role="radiogroup" aria-label="Accent color" className="px-1.5">
            {ACCENT_THEMES.map((t) => {
              const checked = theme === t
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  onClick={() => pickTheme(t)}
                  onKeyDown={(e) => radioKeyNav(e, ACCENT_THEMES, theme, pickTheme)}
                  className={cn(
                    "flex w-full min-h-[38px] items-center gap-2.5 rounded-control px-2 text-[13px]",
                    checked ? "bg-accent-soft font-semibold text-accent-text" : "text-fg-2 hover:bg-hover"
                  )}
                >
                  {/* 16px swatch of the accent this theme would paint in the
                      CURRENT mode — data-mode + data-theme re-derive --accent. */}
                  <span
                    aria-hidden
                    data-app="hauldesk"
                    data-mode={mode}
                    data-theme={t}
                    className="h-4 w-4 shrink-0 rounded-full border border-border-strong bg-accent"
                  />
                  <span className="flex-1 text-left">{APPEARANCE_LABELS[t]}</span>
                  {checked ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
              )
            })}
          </div>

          <div className="my-1 border-t border-border" />
          <button
            type="button"
            aria-pressed={celebrate}
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
              {/* Knob takes --accent-fg on the accent track: white-on-indigo in
                  light, near-black-on-lavender in dark — the same pairing every
                  accent button uses, so the switch reads as "on" in both modes. */}
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full shadow-card transition-transform",
                  celebrate ? "translate-x-[18px] bg-accent-fg" : "translate-x-0.5 bg-surface"
                )}
              />
            </span>
          </button>

          <div className="my-1 border-t border-border" />
          <Link
            href="/hub/settings/app"
            onClick={() => setOpen(false)}
            className="flex w-full min-h-[40px] items-center gap-2.5 rounded-control px-2.5 text-sm font-medium text-fg-2 hover:bg-hover hover:text-fg"
          >
            <MonitorDown className="h-4 w-4 text-fg-3" /> Install the app
          </Link>
          <button
            type="button"
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
