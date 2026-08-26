"use client"

/**
 * Workspace identity chip — tenant-initial avatar + carrier name + chevron.
 * Replaces the ambiguous carrier-name subtitle that used to sit under the
 * product logo. Tenant branding accent (when the carrier set one) appears
 * HERE and only here in office chrome: identity, never interactive controls.
 */
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BookOpen, Check, ChevronDown, Plug, Settings, Wrench } from "lucide-react"
import { LOADOFF_BRAND } from "@/lib/hub/brand"
import { cn } from "@/lib/utils"
import { SimSwitcher } from "@/components/hub/SimSwitcher"
import type { SimView } from "@/lib/hub/mode"

/** Tenant accent when set; otherwise the LoadOff indigo gradient — the chip
 *  always reads as a deliberate identity mark, never a flat gray box. */
function chipStyle(accent?: string | null): React.CSSProperties {
  return accent
    ? { backgroundColor: accent, color: "#fff" }
    : {
        backgroundImage: `linear-gradient(150deg, ${LOADOFF_BRAND.indigo}, ${LOADOFF_BRAND.indigoDeep})`,
        color: "#fff",
      }
}

export function WorkspaceChip({
  name,
  accent,
  isOwner,
  simView,
}: {
  name: string
  /** Carrier branding accent (validated hex) or null for the neutral chip. */
  accent?: string | null
  isOwner: boolean
  /** Owner-only Thind/ATS/All switcher — lives here on the phone so the header does not overflow. */
  simView?: SimView
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  const initial = (name.trim()[0] ?? "W").toUpperCase()

  const links = [
    { href: "/hub/guide", label: "Setup guide", icon: BookOpen },
    { href: "/hub/toolbox", label: "Toolbox", icon: Wrench },
    ...(isOwner
      ? [
          { href: "/hub/settings/integrations", label: "Integrations", icon: Plug },
          { href: "/hub/settings/users", label: "Settings", icon: Settings },
        ]
      : []),
  ]

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-w-0 items-center gap-1.5 rounded-pill py-1 pl-1 pr-2 hover:bg-hover"
      >
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] text-[12px] font-bold"
          style={chipStyle(accent)}
        >
          {initial}
        </span>
        <span className="truncate text-[13px] font-semibold text-fg max-w-[128px] sm:max-w-[180px]">
          {name}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-fg-3 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-60 animate-dropdown-in rounded-card border border-border bg-surface p-1.5 shadow-raised"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold"
              style={chipStyle(accent)}
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{name}</p>
              <p className="flex items-center gap-1 text-[11px] text-fg-3">
                <Check className="h-3 w-3 text-ok" /> Workspace active
              </p>
            </div>
          </div>
          {simView ? (
            <>
              <div className="my-1 border-t border-border" />
              <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-3">
                Simulation company
              </p>
              <div className="px-1.5 pb-1.5">
                <SimSwitcher current={simView} size="comfortable" />
              </div>
              <Link
                href="/hub/settings/simulation"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center px-2.5 text-sm font-medium text-fg-2 hover:bg-hover hover:text-fg"
              >
                Simulation settings
              </Link>
            </>
          ) : null}
          <div className="my-1 border-t border-border" />
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex min-h-[40px] items-center gap-2.5 rounded-control px-2.5 text-sm font-medium text-fg-2 hover:bg-hover hover:text-fg"
            >
              <Icon className="h-4 w-4 text-fg-3" /> {label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
