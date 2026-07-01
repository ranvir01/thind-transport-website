"use client"

/**
 * "Unassigned fuel" inbox — reconcile pump receipts to the load they fueled.
 * The picker defaults to loads on the same truck as the receipt, because that
 * is almost always the right match; every other open load is still reachable
 * below the divider. Assigning a receipt lets the load show its all-in cost.
 */
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Fuel } from "lucide-react"
import { assignFuelLoadAction } from "@/app/hub/_actions/fuel"
import { fmtCentsExact, type FuelTransaction } from "@/lib/hub/types"
import type { AssignableLoad } from "@/lib/hub/fuel"

function loadLabel(l: AssignableLoad): string {
  const lane = l.origin || l.dest ? `${l.origin ?? "?"} → ${l.dest ?? "?"}` : "no lane"
  return `${l.reference} · ${lane}${l.pickup_date ? ` · ${l.pickup_date}` : ""}`
}

function FuelRow({ tx, loads }: { tx: FuelTransaction; loads: AssignableLoad[] }) {
  const [choice, setChoice] = useState("")
  const [done, setDone] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { mine, others } = useMemo(() => {
    const mine = tx.truck_id ? loads.filter((l) => l.truck_id === tx.truck_id) : []
    const mineIds = new Set(mine.map((l) => l.id))
    return { mine, others: loads.filter((l) => !mineIds.has(l.id)) }
  }, [loads, tx.truck_id])

  const assign = () => {
    if (!choice) return
    startTransition(async () => {
      const result = await assignFuelLoadAction(tx.id, choice)
      if (!result.ok) {
        toast.error(result.error ?? "Could not assign")
        return
      }
      const label = loads.find((l) => l.id === choice)?.reference ?? "load"
      setDone(label)
      toast.success(`Fuel linked to ${label}`)
    })
  }

  if (done) {
    return (
      <div className="flex items-center justify-between gap-2 p-3 text-sm text-fg-3">
        <span className="truncate">
          {tx.merchant ?? "Fuel stop"} · {fmtCentsExact(tx.total_cents)}
        </span>
        <span className="shrink-0 text-emerald-400">Linked to {done}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">
          {tx.merchant ?? "Fuel stop"}
          {tx.jurisdiction ? ` · ${tx.jurisdiction}` : ""}
        </p>
        <p className="text-body-xs text-fg-3">
          {new Date(tx.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {tx.truck_unit ? ` · #${tx.truck_unit}` : " · unmatched truck"}
          {` · ${Number(tx.gallons).toFixed(1)} gal · `}
          <span className="font-mono text-accent-text">{fmtCentsExact(tx.total_cents)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          disabled={pending}
          className="min-h-[40px] max-w-[15rem] rounded-control border border-border bg-surface px-2 text-sm text-fg"
        >
          <option value="">Match to load…</option>
          {mine.length > 0 ? (
            <optgroup label="This truck">
              {mine.map((l) => (
                <option key={l.id} value={l.id}>{loadLabel(l)}</option>
              ))}
            </optgroup>
          ) : null}
          {others.length > 0 ? (
            <optgroup label={mine.length > 0 ? "Other loads" : "Loads"}>
              {others.map((l) => (
                <option key={l.id} value={l.id}>{loadLabel(l)}</option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <button
          onClick={assign}
          disabled={!choice || pending}
          className="min-h-[40px] rounded-control bg-accent px-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "…" : "Link"}
        </button>
      </div>
    </div>
  )
}

export function UnassignedFuelPanel({
  transactions,
  loads,
}: {
  transactions: FuelTransaction[]
  loads: AssignableLoad[]
}) {
  if (transactions.length === 0) return null

  return (
    <div className="mb-4 rounded-card border border-border bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Fuel className="h-4 w-4 text-fg-3" />
        <h2 className="text-[13.5px] font-semibold text-fg">
          Unassigned fuel <span className="text-fg-3">· {transactions.length}</span>
        </h2>
        <p className="ml-auto text-body-xs text-fg-3">Match receipts to loads for true cost/load</p>
      </div>
      <div className="divide-y divide-border">
        {transactions.map((tx) => (
          <FuelRow key={tx.id} tx={tx} loads={loads} />
        ))}
      </div>
    </div>
  )
}
