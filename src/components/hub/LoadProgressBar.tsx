import { STATUS_LABELS, type LoadStatus } from "@/lib/hub/types"
import { cn } from "@/lib/utils"

/** The five stages a customer sees. Money statuses collapse into "Delivered". */
export const PUBLIC_FLOW: LoadStatus[] = [
  "booked", "dispatched", "at_pickup", "in_transit", "delivered",
]

export function publicStatus(status: LoadStatus): { label: string; index: number } {
  // Money statuses are internal — public surfaces show "Delivered" at most.
  if (["pod_received", "invoiced", "paid", "settled"].includes(status)) {
    return { label: "Delivered", index: PUBLIC_FLOW.length - 1 }
  }
  const index = PUBLIC_FLOW.indexOf(status)
  return { label: STATUS_LABELS[status] ?? status, index: index === -1 ? 0 : index }
}

/**
 * Five-segment progress bar for forced-dark sharelink/portal surfaces
 * (/track and /hub/portal). Filled segments follow the carrier's
 * --portal-accent (both surfaces set it; unbranded carriers keep the
 * default gold). The current segment breathes (opacity-only pulse, off under
 * reduced motion) so the stage the load is IN reads apart from the ones it
 * has finished. Decorative — pair it with visible status text.
 * Renders nothing for cancelled loads — callers show their own cancelled treatment.
 */
export function LoadProgressBar({ status, className }: { status: LoadStatus; className?: string }) {
  if (status === "cancelled") return null
  const { index } = publicStatus(status)
  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-hidden>
      {PUBLIC_FLOW.map((step, i) => (
        <div
          key={step}
          className={cn(
            "h-1.5 flex-1 rounded-pill",
            i <= index ? "bg-[color:var(--portal-accent)]" : "bg-white/10",
            i === index && index < PUBLIC_FLOW.length - 1 && "motion-safe:animate-pulse"
          )}
        />
      ))}
    </div>
  )
}
