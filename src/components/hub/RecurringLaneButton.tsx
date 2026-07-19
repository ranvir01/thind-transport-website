"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2, Repeat } from "lucide-react"
import { setRecurringLaneAction } from "@/app/hub/_actions/recurring"

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/**
 * Schedule the weekly rebook for a dedicated lane: pick a weekday and the
 * recurring-rebook cron books a fresh copy every matching morning (same
 * copy/strip matrix as Duplicate). Sits next to Duplicate on the load detail
 * page, gated by loads:write.
 */
export function RecurringLaneButton({
  loadId,
  rule,
}: {
  loadId: string
  rule: { weekday: number; enabled: boolean; lastLoadRef: string | null } | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const active = rule?.enabled ?? false

  const save = (weekday: number | null) =>
    startTransition(async () => {
      const result = await setRecurringLaneAction(loadId, weekday)
      if (!result.ok) {
        toast.error(result.error ?? "Could not update the weekly rebook")
        return
      }
      toast.success(
        weekday === null
          ? "Weekly rebook turned off"
          : `Rebooks every ${WEEKDAYS[weekday]} — appointment dates stay blank until dispatch`
      )
      setOpen(false)
      router.refresh()
    })

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-expanded={open}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50 ${
          active
            ? "border-border-strong text-accent-text hover:bg-hover"
            : "border-border-strong text-fg-2 hover:bg-hover"
        }`}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
        {active && rule ? `Weekly · ${WEEKDAYS_SHORT[rule.weekday]}` : "Repeat weekly"}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-2xl">
          <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-fg-3">
            Rebook this lane every…
          </p>
          {WEEKDAYS.map((label, i) => {
            const selected = active && rule?.weekday === i
            return (
              <button
                key={label}
                onClick={() => save(i)}
                disabled={pending}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-fg-2 hover:bg-hover disabled:opacity-50"
              >
                {label}
                {selected ? <Check className="h-4 w-4 text-accent-text" /> : null}
              </button>
            )
          })}
          {active ? (
            <>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => save(null)}
                disabled={pending}
                className="w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-bad hover:bg-hover disabled:opacity-50"
              >
                Turn off weekly rebook
              </button>
              {rule?.lastLoadRef ? (
                <p className="px-2 pb-1 pt-1.5 text-xs text-fg-3">Last booked: {rule.lastLoadRef}</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
