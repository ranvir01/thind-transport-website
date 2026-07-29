"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, TrendingUp } from "lucide-react"
import { saveCostPerMileAction } from "@/app/hub/_actions/operating-cost"
import { btnPrimaryCls, btnSecondaryCls, fieldCls, labelCls, Panel } from "@/components/hub/ui"

export interface OperatingCostView {
  configuredCpmCents: number
  allInCpmCents: number | null
  operatingCpmCents: number | null
  varianceCents: number | null
  totalMiles: number
  hasDriverPay: boolean
  deadheadBlankLoads: number
  rangeLabel: string
}

const dollars = (cents: number | null) => (cents == null ? "—" : `$${(cents / 100).toFixed(2)}`)

export function OperatingCostPanel({
  view,
  canWrite,
}: {
  view: OperatingCostView
  canWrite: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [cents, setCents] = useState(String(view.configuredCpmCents))

  const save = (value: string) =>
    startTransition(async () => {
      const result = await saveCostPerMileAction({ cents: Math.round(Number(value)) })
      if (result.ok) {
        toast.success("Cost per mile saved — margins and lane rankings now use it")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed")
      }
    })

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Panel className="p-4 md:p-5">
        <h2 className="text-[13.5px] font-semibold text-fg mb-1">What you assume a mile costs</h2>
        <p className="text-body-xs text-fg-3 mb-3">
          Used to price every load&apos;s margin on the dispatch board and to rank every lane.
          All-in: fuel, maintenance, tolls, insurance, and driver pay.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className={labelCls} htmlFor="cpm">Cents per mile</label>
            <input
              id="cpm"
              className={`${fieldCls} max-w-[140px]`}
              inputMode="numeric"
              value={cents}
              onChange={(e) => setCents(e.target.value)}
              disabled={!canWrite || pending}
            />
          </div>
          {canWrite ? (
            <button type="button" className={btnPrimaryCls} disabled={pending} onClick={() => save(cents)}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-body-xs text-fg-3">
          Currently {dollars(view.configuredCpmCents)}/mi. The default is ATRI&apos;s 2024 all-in
          marginal cost of trucking ($2.336/mi).
        </p>
      </Panel>

      <Panel className="p-4 md:p-5">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-1">
          <TrendingUp className="h-4 w-4 text-accent-text" /> What your own books say
        </h2>
        <p className="text-body-xs text-fg-3 mb-3">
          Measured from your fuel, maintenance, tolls, expenses and settlements over {view.rangeLabel}.
        </p>

        {view.totalMiles === 0 ? (
          <p className="text-body-sm text-fg-3">
            No miles recorded in this range yet — nothing to measure against.
          </p>
        ) : (
          <>
            <dl className="space-y-1.5 text-body-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-fg-3">Operating only (no driver pay)</dt>
                <dd className="font-mono tabular-nums text-fg">{dollars(view.operatingCpmCents)}/mi</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-3">All-in, including driver pay</dt>
                <dd className="font-mono tabular-nums font-semibold text-fg">{dollars(view.allInCpmCents)}/mi</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                <dt className="text-fg-3">Against your assumption</dt>
                <dd
                  className={`font-mono tabular-nums font-semibold ${
                    view.varianceCents == null ? "text-fg-3" : view.varianceCents > 0 ? "text-bad" : "text-ok"
                  }`}
                >
                  {view.varianceCents == null
                    ? "—"
                    : `${view.varianceCents > 0 ? "+" : ""}${(view.varianceCents / 100).toFixed(2)}/mi`}
                </dd>
              </div>
            </dl>

            {!view.hasDriverPay ? (
              <p className="mt-3 text-body-xs text-warn">
                No driver pay is measurable in this range — either no settlements, or none with
                earning lines. Payroll is roughly half a small carrier&apos;s cost per mile, so the
                figure above is operating cost only, not all-in. Draft a settlement and it becomes real.
              </p>
            ) : view.varianceCents != null && view.varianceCents > 0 ? (
              <p className="mt-3 text-body-xs text-bad">
                Your assumption is {dollars(view.varianceCents)}/mi optimistic, so every margin on the
                dispatch board and every lane ranking currently reads better than the truth.
              </p>
            ) : null}

            {view.deadheadBlankLoads > 0 ? (
              <p className="mt-2 text-body-xs text-fg-3">
                {view.deadheadBlankLoads} load{view.deadheadBlankLoads === 1 ? "" : "s"} in range have no
                deadhead recorded, so total miles are understated and this cost per mile reads high.
              </p>
            ) : null}

            {canWrite && view.allInCpmCents != null && view.allInCpmCents !== view.configuredCpmCents ? (
              <button
                type="button"
                className={`${btnSecondaryCls} mt-3`}
                disabled={pending}
                onClick={() => {
                  setCents(String(view.allInCpmCents))
                  save(String(view.allInCpmCents))
                }}
              >
                Use {dollars(view.allInCpmCents)}/mi
              </button>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  )
}
