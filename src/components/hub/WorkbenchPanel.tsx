"use client"

/**
 * The Toolbox — LoadOff's stay-inside surface for everything that is a page
 * rather than a feed. Two behaviours, declared per resource in workbench.ts:
 *
 *  - "frame": our own pages render right here in an iframe (same origin, so
 *    the browser cannot refuse).
 *  - "sheet": official external sites open ON TOP of LoadOff — the installed
 *    iOS app shows its in-app browser sheet (close it, you're back exactly
 *    where you were), desktop gets a sized popup with LoadOff still behind
 *    it. This is the closest the web platform allows to a native in-app
 *    webview, and pretending an iframe could do it would just render DAT's
 *    refusal page.
 */
import { useState } from "react"
import { ArrowUpRight, PanelTop, X } from "lucide-react"
import { Panel } from "@/components/hub/ui"
import { WORKBENCH_GROUPS, WORKBENCH_RESOURCES, type WorkbenchResource } from "@/lib/hub/workbench"
import { cn } from "@/lib/utils"

function openSheet(url: string) {
  // Sized like a phone so it reads as a sheet, not a lost tab. Standalone
  // iOS ignores the features string and shows the in-app sheet — ideal.
  window.open(url, "loadoff-sheet", "width=480,height=780,noopener,noreferrer")
}

export function WorkbenchPanel() {
  const [framed, setFramed] = useState<WorkbenchResource | null>(null)

  const openResource = (r: WorkbenchResource) => {
    if (r.embed === "frame") setFramed(r)
    else openSheet(r.url)
  }

  if (framed) {
    return (
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="min-w-0 truncate text-sm font-semibold text-fg">{framed.label}</p>
          <button
            type="button"
            onClick={() => setFramed(null)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control px-3 text-sm font-medium text-fg-2 hover:bg-hover hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden /> Back to Toolbox
          </button>
        </div>
        <iframe
          src={framed.url}
          title={framed.label}
          className="h-[75vh] w-full border-0 bg-white"
        />
      </Panel>
    )
  }

  return (
    <div className="space-y-6">
      {WORKBENCH_GROUPS.map((group) => {
        const items = WORKBENCH_RESOURCES.filter((r) => r.group === group)
        if (items.length === 0) return null
        return (
          <section key={group} aria-label={group}>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-fg-3">
              {group}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openResource(r)}
                  className={cn(
                    "group flex min-h-[44px] flex-col rounded-control border border-border bg-surface p-4 text-left",
                    "transition-colors hover:border-border-strong hover:bg-hover",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold text-fg">
                    {r.label}
                    {r.embed === "frame" ? (
                      <PanelTop className="h-3.5 w-3.5 text-fg-3" aria-label="Opens inside LoadOff" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 text-fg-3" aria-label="Opens on top of LoadOff" />
                    )}
                  </span>
                  <span className="mt-1 text-sm text-fg-2">{r.blurb}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
      <p className="text-body-xs text-fg-3">
        Official sites open on top of LoadOff and drop you back exactly where you were — nothing
        here navigates the app away. Live feeds (load boards, ELD, fuel cards) come in through
        Settings → Integrations instead, where the data lands in LoadOff itself.
      </p>
    </div>
  )
}
