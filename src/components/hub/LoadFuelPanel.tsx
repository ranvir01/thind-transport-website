"use client"

/**
 * "Fuel on this load" — pump receipts reconciled to a load, with the all-in
 * economics owners actually care about: revenue minus the fuel that moved it.
 * Only rendered when at least one receipt is linked. Office users with
 * fuel:write can unlink a receipt if it was matched to the wrong load.
 */
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { X } from "lucide-react"
import { assignFuelLoadAction } from "@/app/hub/_actions/fuel"
import { fuelSpendCents } from "@/lib/hub/fuel-core"
import { fmtCents, fmtCentsExact, type FuelTransaction } from "@/lib/hub/types"

function UnlinkButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await assignFuelLoadAction(id, null)
          if (!result.ok) {
            toast.error(result.error ?? "Could not unlink")
            return
          }
          toast.success("Fuel unlinked")
          router.refresh()
        })
      }
      disabled={pending}
      title="Unlink this receipt from the load"
      className="rounded-control p-1 text-fg-3 hover:bg-hover hover:text-fg disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )
}

export function LoadFuelPanel({
  fuel,
  revenueCents,
  canWrite,
}: {
  fuel: FuelTransaction[]
  revenueCents: number
  canWrite: boolean
}) {
  if (fuel.length === 0) return null
  const spend = fuelSpendCents(fuel)

  return (
    <section className="rounded-card border border-border bg-surface shadow-card p-4 md:p-5">
      <h2 className="text-[13.5px] font-semibold text-fg mb-3">Fuel on this load</h2>
      <ul className="space-y-2 text-sm">
        {fuel.map((tx) => (
          <li key={tx.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-fg">
                {tx.merchant ?? "Fuel stop"}
                {tx.jurisdiction ? ` · ${tx.jurisdiction}` : ""}
              </p>
              <p className="text-body-xs text-fg-3">
                {new Date(tx.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {tx.truck_unit ? ` · #${tx.truck_unit}` : ""}
                {` · ${Number(tx.gallons).toFixed(1)} gal`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="font-mono font-medium text-fg tabular-nums">{fmtCentsExact(tx.total_cents)}</span>
              {canWrite ? <UnlinkButton id={tx.id} /> : null}
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-fg-2">Fuel spend</dt>
          <dd className="font-semibold text-fg">{fmtCents(spend)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-fg-2">Revenue after fuel</dt>
          <dd className="font-semibold text-fg">{fmtCents(revenueCents - spend)}</dd>
        </div>
      </dl>
    </section>
  )
}
