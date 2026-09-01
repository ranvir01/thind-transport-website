"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { setDriverRunPayAction } from "@/app/hub/_actions/pay-rules"
import { Panel } from "@/components/hub/ui"

/**
 * Whether drivers see what a run pays them before the settlement is cut (I15).
 *
 * Optimistic: the box flips immediately and reverts if the write fails, because
 * a checkbox that lags a round-trip reads as broken. The pending spinner is the
 * only thing that waits.
 */
export function DriverRunPayToggle({ showRunPay, canWrite }: { showRunPay: boolean; canWrite: boolean }) {
  const [on, setOn] = useState(showRunPay)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function change(next: boolean) {
    const previous = on
    setOn(next)
    startTransition(async () => {
      const result = await setDriverRunPayAction(next)
      if (result.ok) {
        toast.success(next ? "Drivers now see what each run pays them" : "Per-run pay hidden from the driver app")
        router.refresh()
      } else {
        setOn(previous)
        toast.error(result.error ?? "Failed")
      }
    })
  }

  return (
    <Panel className="mb-4 p-4">
      <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
        <input
          type="checkbox"
          checked={on}
          disabled={!canWrite || pending}
          onChange={(e) => change(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-border-strong bg-surface-2 accent-accent disabled:opacity-60"
        />
        <span className="text-sm">
          <span className="font-semibold text-fg inline-flex items-center gap-2">
            Show drivers what each run pays them
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-fg-3" /> : null}
          </span>
          <span className="mt-0.5 block text-fg-3">
            On the load card in the driver app, plus a running total of everything they have
            delivered that payroll has not settled yet. Each driver sees only their own pay —
            never the linehaul or the margin, either way.
          </span>
        </span>
      </label>
    </Panel>
  )
}
