"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { allHubRoutes } from "@/lib/hub/navigation"
import { moneyCls } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

const INPUT_ID = "hauldesk-cmd-input"
const LIST_ID = "hauldesk-cmd-list"
const optionId = (i: number) => `hauldesk-cmd-opt-${i}`

export function CommandPalette({ isOwner, smallCarrier }: { isOwner: boolean; smallCarrier: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  // Keyboard cursor over `filtered`. Reset with the query (in the handlers,
  // not an effect) and clamped below so a shrinking result set can't strand it.
  const [active, setActive] = useState(0)
  // Whatever had focus when the palette opened — it gets it back on close.
  const restoreFocus = useRef<HTMLElement | null>(null)

  const routes = useMemo(() => allHubRoutes(isOwner, smallCarrier), [isOwner, smallCarrier])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return routes.slice(0, 12)
    return routes.filter(
      (r) => r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q) || r.href.includes(q)
    )
  }, [query, routes])
  const activeIdx = filtered.length === 0 ? 0 : Math.min(active, filtered.length - 1)

  const show = () => {
    setQuery("")
    setActive(0)
    setOpen(true)
  }

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      setQuery("")
      router.push(href)
    },
    [router]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => {
          if (v) setQuery("")
          return !v
        })
        setActive(0)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const t = window.setTimeout(() => document.getElementById(INPUT_ID)?.focus(), 0)
    return () => {
      window.clearTimeout(t)
      const back = restoreFocus.current
      restoreFocus.current = null
      if (back && back.isConnected) back.focus()
    }
  }, [open])

  // Keep the keyboard cursor visible inside the scrolling list.
  useEffect(() => {
    if (!open) return
    const el = document.getElementById(optionId(activeIdx))
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" })
  }, [open, activeIdx])

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = filtered.length
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (n) setActive((activeIdx + 1) % n)
        break
      case "ArrowUp":
        e.preventDefault()
        if (n) setActive((activeIdx - 1 + n) % n)
        break
      case "Home":
        e.preventDefault()
        setActive(0)
        break
      case "End":
        e.preventDefault()
        if (n) setActive(n - 1)
        break
      case "Enter": {
        e.preventDefault()
        const row = filtered[activeIdx]
        if (row) go(row.href)
        break
      }
    }
  }

  // Rows grouped under sticky eyebrows. The grouping is REAL aria — listbox >
  // group > option — so the group name reaches assistive tech as the group's
  // accessible name. A listbox may only own `option` and `group`, so the old
  // shape (a role="presentation" <li> holding the eyebrow text) left a bare
  // text node as listbox-owned content and dropped the group from the a11y
  // tree entirely. The match set and its order are still exactly
  // allHubRoutes(); `i` stays the flat index so aria-activedescendant and the
  // arrow keys keep addressing one list. Options stay <button>s so a mouse
  // user — and the interaction battery's `ul button` probe — can click them;
  // tabIndex -1 keeps them out of the tab order (the input owns focus).
  const groups: { name: string; items: { href: string; label: string; i: number }[] }[] = []
  filtered.forEach((row, i) => {
    const last = groups[groups.length - 1]
    const item = { href: row.href, label: row.label, i }
    if (last && last.name === row.group) last.items.push(item)
    else groups.push({ name: row.group, items: [item] })
  })

  return (
    <>
      <button
        type="button"
        aria-label="Search"
        onClick={show}
        className="flex md:hidden h-10 w-10 items-center justify-center rounded-control text-fg-2 hover:bg-hover"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        onClick={show}
        className="hidden md:flex h-9 min-w-[220px] items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-sm text-fg-3 hover:bg-hover"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className={cn(moneyCls, "rounded-control border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-3")}>
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-overlay p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="w-full max-w-lg rounded-card border border-border bg-surface shadow-overlay overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              // aria-modal="true" declares the rest of the page inert to
              // assistive tech, and the overlay makes it unclickable — so Tab
              // must not walk out to the bell and avatar behind it. The input
              // is the only tabbable node in here (options are tabIndex -1 and
              // driven by aria-activedescendant), which is exactly what the
              // combobox pattern wants: focus stays put.
              if (e.key === "Tab") {
                e.preventDefault()
                document.getElementById(INPUT_ID)?.focus()
              }
            }}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 text-fg-3" />
              <input
                id={INPUT_ID}
                role="combobox"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={true}
                aria-controls={LIST_ID}
                aria-activedescendant={filtered.length ? optionId(activeIdx) : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onInputKey}
                placeholder="Go to a screen…"
                className="h-11 flex-1 bg-transparent text-base md:text-sm text-fg placeholder:text-fg-3"
              />
            </div>
            {/* The scrollport is the wrapper, not the listbox: "No matches" is
                not an option and must not sit inside the listbox as owned
                content. Sticky group eyebrows still stick to this scrollport. */}
            <div className="max-h-[50vh] overflow-y-auto pb-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-fg-3">No matches</p>
              ) : null}
              <ul id={LIST_ID} role="listbox" aria-label="Screens">
                {groups.map((group) => (
                  <li key={`${group.name}-${group.items[0]!.i}`} role="group" aria-label={group.name}>
                    {/* aria-hidden: the eyebrow is the group's VISIBLE label —
                        its accessible one is the aria-label above, so screen
                        readers announce the group once, not twice. */}
                    <div
                      aria-hidden
                      className="sticky top-0 z-[1] bg-surface px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-fg-3"
                    >
                      {group.name}
                    </div>
                    {group.items.map((item) => {
                      const selected = item.i === activeIdx
                      return (
                        <button
                          key={item.href}
                          type="button"
                          role="option"
                          id={optionId(item.i)}
                          aria-selected={selected}
                          tabIndex={-1}
                          onClick={() => go(item.href)}
                          onMouseMove={() => {
                            if (!selected) setActive(item.i)
                          }}
                          className={cn(
                            "flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-fg",
                            selected && "bg-selected"
                          )}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
