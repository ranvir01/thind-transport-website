/**
 * X-style link preview card — a purely presentational rendering of a
 * LinkPreview fixture (src/lib/hub/link-previews.ts) at three densities:
 *
 *  - "card": bordered rounded-card surface — the tap target for sheet links.
 *  - "tile": compact vertical variant for dense grids.
 *  - "row":  single-line list row (blurb hidden) — pickers and menus.
 *
 * Server-compatible: no state, no handlers. Interactivity is composed by the
 * caller — `LinkPreviewBody` is children-free markup (spans only, so it can
 * legally sit inside a caller's <button>), and `LinkPreviewCard` wraps it in
 * an <a target="_blank" rel="noopener noreferrer"> when `href` is passed,
 * else a plain <div>. The global mobile press state (globals.css
 * `a:active, button:active`) then applies to whichever interactive element
 * wraps the body. Icons resolve through an explicit Record — never a dynamic
 * import.
 */
import { Globe } from "lucide-react"
import {
  Banknote, Calculator, ClipboardCheck, Clock, CloudSun, Coins, Container,
  CreditCard, FlaskConical, Fuel, Landmark, Mail, Map, Mountain, MountainSnow,
  Network, RadioTower, Receipt, Satellite, Scale, Search, ShieldAlert,
  ShieldCheck, TrafficCone, Wrench, type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LinkPreview, LinkPreviewIcon, LinkPreviewTint } from "@/lib/hub/link-previews"

const ICONS: Record<LinkPreviewIcon, LucideIcon> = {
  Banknote, Calculator, ClipboardCheck, Clock, CloudSun, Coins, Container,
  CreditCard, FlaskConical, Fuel, Landmark, Mail, Map, Mountain, MountainSnow,
  Network, RadioTower, Receipt, Satellite, Scale, Search, ShieldAlert,
  ShieldCheck, TrafficCone, Wrench,
}

const TINT_CHIP: Record<LinkPreviewTint, string> = {
  accent: "bg-accent-soft text-accent-text",
  info: "bg-info-soft text-info",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-surface-2 text-fg-2",
}

export type LinkPreviewDensity = "tile" | "card" | "row"

/** The tinted icon chip on its own — reused by IntegrationsPanel headers. */
export function LinkPreviewChip({
  icon,
  tint,
  className,
}: {
  icon: LinkPreviewIcon
  tint: LinkPreviewTint
  className?: string
}) {
  const Icon = ICONS[icon]
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-control",
        TINT_CHIP[tint],
        className
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  )
}

/** Favicon-less domain row: Globe glyph + bare hostname. Empty domain renders nothing. */
export function LinkPreviewDomain({ domain, className }: { domain: string; className?: string }) {
  if (!domain) return null
  return (
    <span className={cn("flex min-w-0 items-center gap-1 text-[11px] text-fg-3", className)}>
      <Globe className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{domain}</span>
    </span>
  )
}

/**
 * Children-free preview markup. Spans throughout (styled block/flex) so a
 * caller may wrap it in <button>, <a>, or nothing without invalid nesting.
 */
export function LinkPreviewBody({
  preview,
  density,
  className,
}: {
  preview: LinkPreview
  density: LinkPreviewDensity
  className?: string
}) {
  if (density === "row") {
    return (
      <span
        className={cn(
          "flex min-h-[44px] w-full items-center gap-3 rounded-control px-2 py-1.5",
          "transition-colors hover:bg-hover",
          className
        )}
      >
        <LinkPreviewChip icon={preview.icon} tint={preview.tint} />
        <span className="min-w-0 flex-1 truncate text-left font-semibold text-fg">{preview.title}</span>
        <LinkPreviewDomain domain={preview.domain} className="shrink-0" />
      </span>
    )
  }

  if (density === "tile") {
    return (
      <span
        className={cn(
          "flex w-full flex-col rounded-card border border-border bg-surface p-3 text-left shadow-card",
          "transition-colors hover:bg-hover",
          className
        )}
      >
        <LinkPreviewChip icon={preview.icon} tint={preview.tint} />
        <span className="mt-2 block truncate font-semibold text-fg">{preview.title}</span>
        <span className="mt-0.5 line-clamp-2 text-[12.5px] text-fg-3">{preview.blurb}</span>
        <LinkPreviewDomain domain={preview.domain} className="mt-1.5" />
      </span>
    )
  }

  // density === "card"
  return (
    <span
      className={cn(
        "flex w-full items-start gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card",
        "transition-colors hover:bg-hover",
        className
      )}
    >
      <LinkPreviewChip icon={preview.icon} tint={preview.tint} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="block truncate font-semibold text-fg">{preview.title}</span>
        <span className="mt-0.5 line-clamp-2 text-[12.5px] text-fg-3">{preview.blurb}</span>
        <LinkPreviewDomain domain={preview.domain} className="mt-1.5" />
      </span>
    </span>
  )
}

/**
 * Convenience wrapper: pass `href` for a new-tab link (target=_blank,
 * rel="noopener noreferrer"), omit it for inert markup. Callers needing
 * onClick (e.g. the Toolbox's window.open sheet) wrap `LinkPreviewBody` in
 * their own <button> instead.
 */
export function LinkPreviewCard({
  preview,
  density = "card",
  href,
  className,
}: {
  preview: LinkPreview
  density?: LinkPreviewDensity
  href?: string | null
  className?: string
}) {
  const body = <LinkPreviewBody preview={preview} density={density} className={className} />
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block min-w-0">
        {body}
      </a>
    )
  }
  return <div className="min-w-0">{body}</div>
}
