import Link from "next/link"
import { cn } from "@/lib/utils"
import { STATUS_LABELS, type LoadStatus } from "@/lib/hub/types"

/** Form control classes shared by hub inputs/selects (white fields on dark panels). */
export const fieldCls =
  "flex h-11 w-full rounded-xl border-2 border-neutral-200 bg-white px-3.5 py-2.5 text-base md:text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/25 focus-visible:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50"

export const labelCls = "block text-label-lg text-steel-100 mb-1.5"

export function Panel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(20,31,47,0.94),rgba(11,20,34,0.96))] shadow-lg",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
  titleExtra,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  /** Inline help (HelpTip) rendered next to the title. */
  titleExtra?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="flex items-center gap-1.5 font-display text-2xl md:text-3xl font-extrabold uppercase tracking-wide text-white">
          {title}
          {titleExtra}
        </h1>
        {subtitle ? <p className="text-body-sm text-steel-200 mt-1">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <Panel className="p-8 text-center">
      <p className="text-white font-semibold">{title}</p>
      {hint ? <p className="text-body-sm text-steel-200 mt-1">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Panel>
  )
}

const STATUS_COLORS: Record<LoadStatus, string> = {
  quoted: "bg-steel-700/60 text-steel-100 border-steel-500/40",
  booked: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  dispatched: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
  at_pickup: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  in_transit: "bg-gold-500/15 text-gold-300 border-gold-400/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  pod_received: "bg-teal-500/15 text-teal-300 border-teal-400/30",
  invoiced: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  paid: "bg-green-500/15 text-green-300 border-green-400/30",
  settled: "bg-steel-700/60 text-steel-200 border-steel-500/40",
  cancelled: "bg-red-500/15 text-red-300 border-red-400/30",
}

export function StatusBadge({ status, className }: { status: LoadStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
        STATUS_COLORS[status] ?? STATUS_COLORS.quoted,
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

/** Red/amber/green pill for expiry dates. Server-rendered, so "now" is request time. */
export function ExpiryPill({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-steel-400 text-body-sm">—</span>
  const due = new Date(date)
  // eslint-disable-next-line react-hooks/purity -- server component; per-request "now" is intended
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000)
  const cls =
    days < 0
      ? "bg-red-500/20 text-red-300 border-red-400/40"
      : days <= 30
        ? "bg-gold-500/20 text-gold-300 border-gold-400/40"
        : "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold", cls)}>
      {due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      {days < 0 ? " · expired" : days <= 30 ? ` · ${days}d` : ""}
    </span>
  )
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-body-sm text-steel-200 hover:text-white mb-4">
      ← {label}
    </Link>
  )
}
