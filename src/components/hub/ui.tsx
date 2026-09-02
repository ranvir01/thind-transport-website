import Link from "next/link"
import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_LABELS, type LoadStatus } from "@/lib/hub/types"

/** Form controls — light surfaces inside hub cards.
 *  16px text on touch widths (iOS zooms into anything smaller on focus);
 *  compact 34px/14px from md up where a mouse is doing the tapping. */
export const fieldCls =
  "flex h-11 md:h-[34px] w-full rounded-control border border-border-strong bg-surface px-3 text-base md:text-sm text-fg shadow-none transition-colors placeholder:text-fg-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50"

export const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-fg-3 mb-1.5"

/** Error-state field: danger border + ring; pair with a helper line in text-bad. */
export const fieldErrorCls =
  "border-bad focus-visible:ring-[var(--red-soft)] focus-visible:border-bad"

/**
 * Form controls for the forced-dark driver/portal chrome. Those surfaces are
 * always navy regardless of the office mode toggle, so the mode-dependent
 * surface/fg tokens above render light-mode values there (near-black text on
 * navy). See AGENTS.md "No mode-dependent tokens on forced-dark surfaces".
 */
export const fieldDarkCls =
  "flex h-11 md:h-[34px] w-full rounded-control border border-white/15 bg-white/5 px-3 text-base md:text-sm text-white shadow-none transition-colors placeholder:text-steel-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"

export const labelDarkCls =
  "block text-[11px] font-semibold uppercase tracking-wide text-steel-400 mb-1.5"

/**
 * Textarea on the forced-dark surfaces. `fieldDarkCls` starts with a fixed
 * `h-11`, which silently overrides `rows` — the incident "What happened?"
 * box at a crash scene was a single 44px line. Grows with content where the
 * engine supports field-sizing; keeps the rows fallback everywhere else.
 */
export const fieldDarkTextareaCls =
  "block w-full min-h-[96px] rounded-control border border-white/15 bg-white/5 px-3 py-2.5 text-base md:text-sm text-white shadow-none transition-colors placeholder:text-steel-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:border-white/40 disabled:cursor-not-allowed disabled:opacity-50 [field-sizing:content] max-h-[40vh]"

/**
 * Primary action on the forced-dark driver/portal surfaces. `btnPrimaryCls`
 * (bg-accent) is the OFFICE accent — indigo — and its disabled state mixes
 * with the office --bg, which made every first-paint-disabled driver button a
 * pale lavender slab at 2.5:1. The fill is the carrier's resolved accent
 * (always ≥4.5:1 on the dark card, so a dark label is always legible) and the
 * disabled state follows Material: 12% container, 38% content.
 */
export const btnDriverPrimaryCls =
  "press-sink inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-control px-4 text-base font-semibold text-[color:var(--driver-accent-fg,#121316)] bg-[color:var(--driver-accent-fill,var(--driver-accent))] hover:brightness-110 active:brightness-95 transition-[filter,transform,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--driver-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-driver-bg disabled:pointer-events-none disabled:bg-white/10 disabled:text-white/40"

/** Quiet secondary action on the forced-dark surfaces (outline, 56px). */
export const btnDriverSecondaryCls =
  "press-sink inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-control border border-white/15 bg-white/5 px-4 text-base font-semibold text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-40"

/** Primary action — accent fill (replaces marketing red CTAs inside hub). */
export const btnPrimaryCls =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover transition-colors disabled:opacity-50"

/** Secondary / outline action. */
export const btnSecondaryCls =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control border border-border-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-hover transition-colors"

/** Section heading inside a card (sentence case). */
export const sectionTitleCls = "text-[13.5px] font-semibold text-fg"

/** Table header row. */
export const tableHeadCls =
  "border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-fg-3"

/** Money / IDs — monospace per HANDOFF. */
export const moneyCls = "font-mono font-medium text-fg tabular-nums"

/** Inline link accent. */
export const linkAccentCls = "font-semibold text-accent-text hover:underline"

/**
 * Button — four-rung height ladder (32/40/48/56). The 48/56 rungs hold the
 * touch floor; sm/md are for pointer-dense desktop toolbars only (the global
 * mobile rule still enforces 44px there). All states: default, hover, press
 * (global scale + inset via .press-sink), focus-visible ring, disabled,
 * loading (spinner overlays a hidden label so width never jumps).
 */
const buttonBase =
  "press-sink relative inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50"

const BUTTON_SIZE = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-3.5 text-sm",
  lg: "h-12 px-5 text-sm",
  xl: "h-14 px-6 text-base",
} as const

const BUTTON_VARIANT = {
  primary: "bg-accent text-accent-fg shadow-card hover:bg-accent-hover",
  secondary: "border border-border-strong bg-surface text-fg hover:bg-hover",
  ghost: "text-fg-2 hover:bg-hover hover:text-fg",
  danger: "bg-bad text-white shadow-card hover:opacity-90",
  link: "text-accent-text underline-offset-2 hover:underline",
} as const

function ButtonSpinner() {
  return (
    <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </span>
  )
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANT
  size?: keyof typeof BUTTON_SIZE
  /** Swaps the label for a spinner while preserving width — no layout jump. */
  loading?: boolean
}) {
  return (
    <button
      className={cn(buttonBase, BUTTON_SIZE[size], BUTTON_VARIANT[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      {loading ? <ButtonSpinner /> : null}
    </button>
  )
}

export function Panel({
  className,
  children,
  title,
  action,
}: {
  className?: string
  children: React.ReactNode
  title?: string
  action?: React.ReactNode
}) {
  return (
    <section className={cn("rounded-card border border-border bg-surface shadow-card", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-[18px]">
          <h2 className="text-[13.5px] font-semibold text-fg">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** Alias for Panel — matches HANDOFF naming. */
export const Card = Panel

export function PageHeader({
  title,
  subtitle,
  action,
  titleExtra,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  titleExtra?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-1.5 text-[22px] font-semibold tracking-tight text-fg">
          {title}
          {titleExtra}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-fg-2">{subtitle}</p> : null}
      </div>
      {action ? <div className="max-w-full shrink-0">{action}</div> : null}
    </div>
  )
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
  /** Tinted icon for the tile; defaults to an inbox. */
  icon?: React.ReactNode
}) {
  return (
    <section className="rounded-card border border-dashed border-border-strong px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-card bg-surface-2 text-fg-3">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="font-semibold text-fg">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-sm text-sm text-fg-3">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </section>
  )
}

export type PillTone = "neutral" | "accent" | "ok" | "warn" | "bad" | "info"

const PILL_TONE: Record<PillTone, string> = {
  neutral: "bg-surface-2 text-fg-2",
  accent: "bg-accent-soft text-accent-text",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode
  tone?: PillTone
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-[3px] text-[11.5px] font-semibold",
        PILL_TONE[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

const STATUS_TONE: Record<LoadStatus, PillTone> = {
  quoted: "neutral",
  booked: "neutral",
  dispatched: "accent",
  at_pickup: "warn",
  in_transit: "info",
  delivered: "ok",
  pod_received: "ok",
  invoiced: "accent",
  paid: "ok",
  settled: "neutral",
  cancelled: "bad",
}

export function StatusBadge({ status, className }: { status: LoadStatus; className?: string }) {
  return (
    <Pill tone={STATUS_TONE[status] ?? "neutral"} className={className}>
      {STATUS_LABELS[status] ?? status}
    </Pill>
  )
}

export function ExpiryPill({
  date,
  miles,
  tone,
}: {
  date?: string | null
  /** Mileage-based fallback when there's no usable due date (see MaintenancePanel). */
  miles?: number | null
  tone?: PillTone
}) {
  if (date) {
    const due = new Date(date)
    // eslint-disable-next-line react-hooks/purity -- server component; per-request "now" is intended
    const days = Math.ceil((due.getTime() - Date.now()) / 86400000)
    const t: PillTone = tone ?? (days < 0 ? "bad" : days <= 30 ? "warn" : "ok")
    return (
      <Pill tone={t}>
        {due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        {days < 0 ? " · expired" : days <= 30 ? ` · ${days}d` : ""}
      </Pill>
    )
  }
  if (miles != null) {
    const t: PillTone = tone ?? (miles <= 0 ? "bad" : "warn")
    const rounded = Math.abs(Math.round(miles)).toLocaleString()
    return <Pill tone={t}>{miles <= 0 ? `${rounded} mi overdue` : `${rounded} mi left`}</Pill>
  }
  return <span className="text-sm text-fg-3">—</span>
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-2 hover:text-fg">
      ← {label}
    </Link>
  )
}
