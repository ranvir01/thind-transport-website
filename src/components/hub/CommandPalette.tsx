"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"

const COMMANDS = [
  { label: "Today dashboard", href: "/hub", keywords: "home overview kpi" },
  { label: "New load", href: "/hub/loads/new", keywords: "create book dispatch" },
  { label: "Paste rate con", href: "/hub/loads/paste", keywords: "dat uber clipboard intake" },
  { label: "Loadboard", href: "/hub/loads", keywords: "loads search board" },
  { label: "Dispatch board", href: "/hub/dispatch", keywords: "status columns trucks" },
  { label: "Best-load ranker", href: "/hub/ranker", keywords: "score compare math candidate" },
  { label: "Money / AR", href: "/hub/money", keywords: "invoices payments aging receivables" },
  { label: "Draft settlements", href: "/hub/money/settlements", keywords: "driver pay payroll 1099" },
  { label: "Fleet", href: "/hub/fleet", keywords: "trucks trailers equipment" },
  { label: "Drivers", href: "/hub/drivers", keywords: "cdl med card contractors" },
  { label: "Customers", href: "/hub/customers", keywords: "brokers shippers" },
  { label: "Fuel", href: "/hub/fuel", keywords: "efs wex comdata ifta" },
  { label: "Compliance", href: "/hub/compliance", keywords: "expiry cdl insurance ifta ucr" },
  { label: "Universal import", href: "/hub/import", keywords: "csv spreadsheet fuel tolls loads" },
  { label: "Onboarding", href: "/hub/onboarding", keywords: "setup get things done" },
  { label: "Pay tariffs", href: "/hub/settings/pay-tariffs", keywords: "deductions categories recurring" },
  { label: "Integrations", href: "/hub/settings/integrations", keywords: "credentials smtp imap truckx quickbooks" },
  { label: "Appearance", href: "/hub/settings/appearance", keywords: "theme color mode" },
  { label: "Driver PWA", href: "/hub/driver", keywords: "mobile camera pod" },
  { label: "Broker sandbox tracking", href: "/track/sandbox", keywords: "portal tracking pod bol" },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return COMMANDS
    return COMMANDS.filter((command) =>
      `${command.label} ${command.href} ${command.keywords}`.toLowerCase().includes(needle)
    )
  }, [query])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-h-[38px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-steel-200 hover:bg-white/10 lg:flex"
      >
        <Search className="h-3.5 w-3.5" />
        Cmd+K
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="mx-auto mt-16 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-navy-900 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <Search className="h-5 w-5 text-gold" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Jump to a load, page, or action…"
                className="min-h-[44px] flex-1 bg-transparent text-base text-white outline-none placeholder:text-steel-400"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-steel-200 hover:bg-white/5"
                aria-label="Close command palette"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {matches.length === 0 ? (
                <p className="p-4 text-sm text-steel-300">No matching command.</p>
              ) : (
                matches.map((command) => (
                  <Link
                    key={command.href}
                    href={command.href}
                    onClick={() => {
                      setOpen(false)
                      setQuery("")
                    }}
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    {command.label}
                    <span className="mt-0.5 block text-xs font-normal text-steel-400">{command.href}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
