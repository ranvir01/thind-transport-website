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

export type ExpiryTone = "bad" | "warn" | "ok"

/**
 * Pure day-math, split out from the component so the expired/soon/ok
 * boundaries (0d and 30d) are unit-testable without a DOM — this repo has no
 * React render-test setup (no jsdom/testing-library), so component logic
 * only gets covered when it lives in a plain function like this one.
 */
export function expiryTone(date: string, now: number): { days: number; tone: ExpiryTone } {
  const days = Math.ceil((new Date(date).getTime() - now) / 86400000)
  const tone: ExpiryTone = days < 0 ? "bad" : days <= 30 ? "warn" : "ok"
  return { days, tone }
}

const TONE_CLS: Record<ExpiryTone, string> = {
  bad: "bg-red-500/20 text-red-300",
  warn: "border border-orange/40 bg-orange/15 text-orange",
  ok: "bg-green-500/25 text-green-300",
}

export function DriverExpiryPill({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-sm text-steel-400">—</span>
  // eslint-disable-next-line react-hooks/purity -- server component; per-request "now" is intended
  const { days, tone } = expiryTone(date, Date.now())
  const label = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-[3px] text-[11.5px] font-semibold",
        TONE_CLS[tone]
      )}
    >
      {label}
      {tone === "bad" ? " · expired" : tone === "warn" ? ` · ${days}d` : ""}
    </span>
  )
}
