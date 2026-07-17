import { STATUS_LABELS, type LoadStatus } from "@/lib/hub/types"

/** The five stages a customer sees. Money statuses collapse into "Delivered". */
export const PUBLIC_LOAD_FLOW: LoadStatus[] = [
  "booked", "dispatched", "at_pickup", "in_transit", "delivered",
]

export function publicLoadProgress(status: LoadStatus): { label: string; index: number } {
  // Money statuses are internal — customer surfaces show "Delivered" at most.
  if (["pod_received", "invoiced", "paid", "settled"].includes(status)) {
    return { label: "Delivered", index: PUBLIC_LOAD_FLOW.length - 1 }
  }
  const index = PUBLIC_LOAD_FLOW.indexOf(status)
  return { label: STATUS_LABELS[status] ?? status, index: index === -1 ? 0 : index }
}

/**
 * Five-segment progress bar for forced-dark customer surfaces (/track and
 * /hub/portal): gold = reached, white/10 = ahead. Renders nothing for
 * cancelled loads — callers show their own cancelled treatment.
 */
export function LoadProgressBar({ status, className }: { status: LoadStatus; className?: string }) {
  if (status === "cancelled") return null
  const { index } = publicLoadProgress(status)
  return (
    <div className={className ? `flex items-center gap-1.5 ${className}` : "flex items-center gap-1.5"}>
      {PUBLIC_LOAD_FLOW.map((step, i) => (
        <div key={step} className={`h-2 flex-1 rounded-full ${i <= index ? "bg-gold" : "bg-white/10"}`} />
      ))}
    </div>
  )
}
