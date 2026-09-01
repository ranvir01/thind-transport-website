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
 * default gold). Decorative — pair it with visible status text.
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
          className={`h-2 flex-1 rounded-full ${i <= index ? "bg-[color:var(--portal-accent)]" : "bg-white/10"}`}
        />
      ))}
    </div>
  )
}
