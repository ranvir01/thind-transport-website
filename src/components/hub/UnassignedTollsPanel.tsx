"use client"

/**
 * "Unassigned tolls" inbox — the CSV import matches transponder statements to
 * a truck by unit number, but any row whose unit didn't match a known truck
 * lands here with truck_id = NULL instead of silently disappearing into the
 * total. Reconciling it is what makes per-truck toll spend (and eventually
 * truck P&L) trustworthy.
 */
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Route } from "lucide-react"
import { assignTollTruckAction } from "@/app/hub/_actions/tolls"
import { fmtCentsExact } from "@/lib/hub/types"
import type { TollTransaction } from "@/lib/hub/tolls"

interface TruckOption {
  id: string
  unit_number: string
}

function TollRow({ tx, trucks }: { tx: TollTransaction; trucks: TruckOption[] }) {
  const [choice, setChoice] = useState("")
  const [done, setDone] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const assign = () => {
    if (!choice) return
    startTransition(async () => {
      const result = await assignTollTruckAction(tx.id, choice)
      if (!result.ok) {
        toast.error(result.error ?? "Could not assign")
        return
      }
      const unit = trucks.find((t) => t.id === choice)?.unit_number ?? "truck"
      setDone(unit)
      toast.success(`Toll assigned to #${unit}`)
    })
  }

  if (done) {
    return (
      <div className="flex items-center justify-between gap-2 p-3 text-sm text-fg-3">
        <span className="truncate">
          {tx.plaza ?? "Toll"} · {fmtCentsExact(tx.amount_cents)}
        </span>
        <span className="shrink-0 text-ok">Assigned to #{done}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">
          {tx.plaza ?? "Toll"}
          {tx.jurisdiction ? ` · ${tx.jurisdiction}` : ""}
        </p>
        <p className="text-body-xs text-fg-3">
          {new Date(tx.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {tx.transponder ? ` · ${tx.transponder}` : ""}
          {" · "}
          <span className="font-mono text-accent-text">{fmtCentsExact(tx.amount_cents)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          disabled={pending}
          className="min-h-[40px] max-w-[15rem] rounded-control border border-border bg-surface px-2 text-sm text-fg"
        >
          <option value="">Assign truck…</option>
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>#{t.unit_number}</option>
          ))}
        </select>
        <button
          onClick={assign}
          disabled={!choice || pending}
          className="min-h-[40px] rounded-control bg-accent px-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "…" : "Assign"}
        </button>
      </div>
    </div>
  )
}

const COLLAPSED_COUNT = 8

export function UnassignedTollsPanel({
  transactions,
  trucks,
}: {
  transactions: TollTransaction[]
  trucks: TruckOption[]
}) {
  const [showAll, setShowAll] = useState(false)
  if (transactions.length === 0) return null

  const visible = showAll ? transactions : transactions.slice(0, COLLAPSED_COUNT)
  const hidden = transactions.length - visible.length

  return (
    <div className="mb-4 rounded-card border border-border bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Route className="h-4 w-4 text-fg-3" />
        <h2 className="text-[13.5px] font-semibold text-fg">
          Unassigned tolls <span className="text-fg-3">· {transactions.length}</span>
        </h2>
        <p className="ml-auto text-body-xs text-fg-3">Match tolls to trucks for true cost/truck</p>
      </div>
      <div className="divide-y divide-border">
        {visible.map((tx) => (
          <TollRow key={tx.id} tx={tx} trucks={trucks} />
        ))}
      </div>
      {hidden > 0 || showAll ? (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="block w-full border-t border-border p-3 text-center text-body-xs font-semibold text-accent-text hover:bg-hover"
        >
          {showAll ? "Show fewer" : `Show ${hidden} older toll${hidden === 1 ? "" : "s"}`}
        </button>
      ) : null}
    </div>
  )
}
