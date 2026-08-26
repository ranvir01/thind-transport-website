import { FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"

/** Persistent SIMULATION pill — header and footer. */
export function SimulationBadge({
  dark = false,
  compact = false,
}: {
  dark?: boolean
  compact?: boolean
}) {
  return (
    <span
      title="Generated data — nothing real leaves this app. No email, ELD, fuel, QuickBooks, or IRS filing is live."
      className={cn(
        "inline-flex items-center gap-1 rounded-pill font-bold uppercase tracking-wide",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        dark
          ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40"
          : "bg-warn-soft text-warn ring-1 ring-warn/30"
      )}
    >
      <FlaskConical className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
      Simulation
    </span>
  )
}
