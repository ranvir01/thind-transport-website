import Link from "next/link"
import { cn } from "@/lib/utils"
import { STATUS_LABELS, type LoadStatus } from "@/lib/hub/types"

/** Form controls — light surfaces inside hub cards. */
export const fieldCls =
  "flex h-[34px] w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-fg shadow-none transition-colors placeholder:text-fg-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50"

export const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-fg-3 mb-1.5"

/**
 * Form controls for the forced-dark driver/portal chrome. Those surfaces are
 * always navy regardless of the office mode toggle, so the mode-dependent
 * surface/fg tokens above render light-mode values there (near-black text on
 * navy). See AGENTS.md "No mode-dependent tokens on forced-dark surfaces".
 */
export const fieldDarkCls =
  "flex h-[34px] w-full rounded-control border border-white/15 bg-white/5 px-3 text-sm text-white shadow-none transition-colors placeholder:text-steel-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"

export const labelDarkCls =
  "block text-[11px] font-semibold uppercase tracking-wide text-steel-400 mb-1.5"

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

const buttonBase =
  "inline-flex h-[34px] items-center justify-center gap-2 rounded-control px-3.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50"

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
}) {
  return (
    <button
      className={cn(
        buttonBase,
        variant === "primary" && "bg-accent text-accent-fg hover:bg-accent-hover",
        variant === "secondary" && "border border-border-strong bg-surface text-fg hover:bg-hover",
        variant === "ghost" && "text-fg-2 hover:bg-hover hover:text-fg",
        variant === "danger" && "bg-bad text-fg hover:opacity-90",
        className
      )}
      {...props}
    >
      {children}
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
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <Panel className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-card bg-surface-2 text-fg-3">
        <span className="text-lg">—</span>
      </div>
      <p className="font-medium text-fg">{title}</p>
      {hint ? <p className="mt-1 text-sm text-fg-3">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Panel>
  )
}

type PillTone = "neutral" | "accent" | "ok" | "warn" | "bad" | "info"

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

export function ExpiryPill({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-sm text-fg-3">—</span>
  const due = new Date(date)
  // eslint-disable-next-line react-hooks/purity -- server component; per-request "now" is intended
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000)
  const tone: PillTone = days < 0 ? "bad" : days <= 30 ? "warn" : "ok"
  return (
    <Pill tone={tone}>
      {due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      {days < 0 ? " · expired" : days <= 30 ? ` · ${days}d` : ""}
    </Pill>
  )
}

export function KpiCard({
  label,
  value,
  sub,
  href,
  className,
}: {
  label: string
  value: string | number
  sub?: string
  href?: string
  className?: string
}) {
  const inner = (
    <>
      <p className="text-xs font-medium text-fg-3">{label}</p>
      <p className="mt-1 font-mono text-2xl font-medium tracking-tight text-fg">{value}</p>
      {sub ? <p className="mt-0.5 text-[11.5px] text-fg-3">{sub}</p> : null}
    </>
  )
  const cls = cn(
    "block rounded-card border border-border bg-surface p-4 shadow-card transition-colors hover:bg-hover",
    className
  )
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    )
  }
  return <div className={cls}>{inner}</div>
}

export function HosBar({ hours, max = 11 }: { hours: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (hours / max) * 100))
  const tone = hours <= 2 ? "bg-bad" : hours <= 4 ? "bg-warn" : "bg-ok"
  return (
    <div className="h-[5px] w-full overflow-hidden rounded-pill bg-surface-2" title={`${hours}h remaining`}>
      <div className={cn("h-full rounded-pill transition-all", tone)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-card border border-border bg-surface shadow-card", className)}>
      <table className="min-w-[640px] w-full text-sm">{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 bg-surface-2 text-[11px] font-semibold uppercase tracking-wide text-fg-3">
      {children}
    </thead>
  )
}

export function TableRow({
  children,
  className,
  href,
}: {
  children: React.ReactNode
  className?: string
  href?: string
}) {
  if (href) {
    return (
      <tr className="group border-b border-border last:border-0">
        <td colSpan={999} className="p-0">
          <Link
            href={href}
            className={cn("flex w-full items-center hover:bg-hover transition-colors", className)}
          >
            {children}
          </Link>
        </td>
      </tr>
    )
  }
  return <tr className={cn("border-b border-border last:border-0 hover:bg-hover", className)}>{children}</tr>
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-2 hover:text-fg">
      ← {label}
    </Link>
  )
}
