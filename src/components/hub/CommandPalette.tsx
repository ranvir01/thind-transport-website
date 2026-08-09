"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { allHubRoutes } from "@/lib/hub/navigation"
import { cn } from "@/lib/utils"

export function CommandPalette({ isOwner, smallCarrier }: { isOwner: boolean; smallCarrier: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const routes = useMemo(() => allHubRoutes(isOwner, smallCarrier), [isOwner, smallCarrier])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return routes.slice(0, 12)
    return routes.filter(
      (r) => r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q) || r.href.includes(q)
    )
  }, [query, routes])

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
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => document.getElementById("hauldesk-cmd-input")?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label="Search"
        onClick={() => {
          setQuery("")
          setOpen(true)
        }}
        className="flex md:hidden h-10 w-10 items-center justify-center rounded-control text-fg-2 hover:bg-hover"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        onClick={() => {
          setQuery("")
          setOpen(true)
        }}
        className="hidden md:flex h-9 min-w-[220px] items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-sm text-fg-3 hover:bg-hover"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-3">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-card border border-border bg-surface shadow-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 text-fg-3" />
              <input
                id="hauldesk-cmd-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Go to a screen…"
                className="h-11 flex-1 bg-transparent text-base md:text-sm text-fg outline-none placeholder:text-fg-3"
              />
            </div>
            <ul className="max-h-[50vh] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-fg-3">No matches</li>
              ) : (
                filtered.map((row) => (
                  <li key={row.href}>
                    <button
                      type="button"
                      onClick={() => go(row.href)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-hover"
                    >
                      <span className="font-medium text-fg">{row.label}</span>
                      <span className="text-xs text-fg-3">{row.group}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
