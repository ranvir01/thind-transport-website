/**
 * Forced-dark counterpart to `@/components/hub/ui`'s ExpiryPill. That version
 * colors its ok/warn/bad states with the office's semantic pill tokens, which
 * resolve to their light-mode values here since drivers never touch the
 * office appearance toggle — on the driver app's bg-navy chrome that renders
 * as a pale mint/amber/red chip floating on a dark screen instead of the
 * fixed dark palette every other driver surface uses (AGENTS.md: no
 * mode-dependent tokens on forced-dark surfaces). Same day-math, same three
 * tones, fixed colors: green like DvirForm's OK toggle, orange like
 * OfflineSync's offline banner, red for an actually expired doc.
 */
import { cn } from "@/lib/utils"

export function DriverExpiryPill({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-sm text-steel-400">—</span>
  const due = new Date(date)
  // eslint-disable-next-line react-hooks/purity -- server component; per-request "now" is intended
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000)
  const label = due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-[3px] text-[11.5px] font-semibold",
        days < 0
          ? "bg-red-500/20 text-red-300"
          : days <= 30
            ? "border border-orange/40 bg-orange/15 text-orange"
            : "bg-green-500/25 text-green-300"
      )}
    >
      {label}
      {days < 0 ? " · expired" : days <= 30 ? ` · ${days}d` : ""}
    </span>
  )
}
