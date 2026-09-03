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
 *
 * Rows render as X-style link-preview cards from the committed fixtures in
 * link-previews.ts: sheet rows as density="card" tap targets, frame picker
 * rows as density="row" list rows. Both stay <button>s so the open logic
 * (window.open sheet / in-place iframe) is unchanged.
 */
import { useState } from "react"
import { X } from "lucide-react"
import { Panel } from "@/components/hub/ui"
import { LinkPreviewBody } from "@/components/hub/LinkPreviewCard"
import { linkPreview, type LinkPreview } from "@/lib/hub/link-previews"
import { WORKBENCH_GROUPS, WORKBENCH_RESOURCES, type WorkbenchResource } from "@/lib/hub/workbench"
import { cn } from "@/lib/utils"

function openSheet(url: string) {
  // Sized like a phone so it reads as a sheet, not a lost tab. Standalone
  // iOS ignores the features string and shows the in-app sheet — ideal.
  window.open(url, "loadoff-sheet", "width=480,height=780,noopener,noreferrer")
}

/** Fixture lookup with a graceful fallback built from the registry row itself. */
function previewFor(r: WorkbenchResource): LinkPreview {
  return (
    linkPreview(r.id) ?? {
      id: r.id,
      title: r.label,
      blurb: r.blurb,
      domain: r.url.startsWith("https://") ? new URL(r.url).hostname.replace(/^www\./, "") : "",
      url: r.url.startsWith("https://") ? r.url : null,
      icon: "Search",
      tint: "neutral",
    }
  )
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
        {/* No background class on purpose. Four of the framed resources are
            third-party sites (wsdot, tripcheck, weather.gov, eia.gov); when an
            embedded document leaves its own canvas transparent, the IFRAME
            element's background is what paints, so an office surface token
            would put those pages' near-black default text on the near-black
            dark --surface. Letting the UA paint the iframe canvas honours
            color-scheme and stays white under a light third-party document;
            our own framed pages (/tools/*, /resources, /cdl-jobs) set an
            explicit body background in globals.css, so they lose nothing. */}
        <iframe
          src={framed.url}
          title={framed.label}
          className="h-[75vh] w-full border-0"
        />
      </Panel>
    )
  }

  return (
    <div className="space-y-6">
      {WORKBENCH_GROUPS.map((group) => {
        const items = WORKBENCH_RESOURCES.filter((r) => r.group === group)
        if (items.length === 0) return null
        const frames = items.filter((r) => r.embed === "frame")
        const sheets = items.filter((r) => r.embed === "sheet")
        return (
          <section key={group} aria-label={group}>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-fg-3">
              {group}
            </h2>
            {frames.length > 0 ? (
              <div className="space-y-1">
                {frames.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openResource(r)}
                    title="Opens inside LoadOff"
                    className="block w-full rounded-control text-left"
                  >
                    <LinkPreviewBody preview={previewFor(r)} density="row" />
                  </button>
                ))}
              </div>
            ) : null}
            {sheets.length > 0 ? (
              <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", frames.length > 0 && "mt-3")}>
                {sheets.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openResource(r)}
                    title="Opens on top of LoadOff"
                    className={cn("block min-h-[44px] rounded-card text-left")}
                  >
                    <LinkPreviewBody preview={previewFor(r)} density="card" className="h-full" />
                  </button>
                ))}
              </div>
            ) : null}
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
