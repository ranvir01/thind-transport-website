"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ArrowRight, Ban, Loader2, MessageSquare } from "lucide-react"
import {
  advanceLoadStatusAction, logCheckCallAction, setLoadStatusAction, stopTimestampAction,
} from "@/app/hub/_actions/loads"
import { fieldCls } from "@/components/hub/ui"
import { NEXT_STATUS, STATUS_LABELS, canCancelLoad, type LoadStatus } from "@/lib/hub/types"

export function AdvanceStatusButton({
  loadId,
  status,
  compact = false,
}: {
  loadId: string
  status: LoadStatus
  compact?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const next = NEXT_STATUS[status]
  if (!next) return null

  const advance = () =>
    startTransition(async () => {
      const result = await advanceLoadStatusAction(loadId)
      if (result.ok) toast.success(`Moved to ${STATUS_LABELS[next]}`)
      else toast.error(result.error ?? "Could not advance status")
    })

  if (compact) {
    return (
      <button
        onClick={advance}
        disabled={pending}
        className="inline-flex min-h-[36px] items-center gap-1 rounded-control bg-accent px-2.5 text-[12px] font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
        {STATUS_LABELS[next]}
      </button>
    )
  }

  return (
    <button
      onClick={advance}
      disabled={pending}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      Mark {STATUS_LABELS[next]}
    </button>
  )
}

export function CancelLoadButton({ loadId, status }: { loadId: string; status: LoadStatus }) {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  // Once money work starts (invoiced+), cancellation is an accounting decision, not a click.
  if (!canCancelLoad(status)) return null

  const cancel = () =>
    startTransition(async () => {
      const result = await setLoadStatusAction(loadId, "cancelled")
      if (result.ok) toast.success("Load cancelled")
      else toast.error(result.error ?? "Could not cancel load")
      setConfirming(false)
    })

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-bad-soft px-4 text-sm font-semibold text-bad hover:bg-bad-soft"
      >
        <Ban className="h-4 w-4" /> Cancel load
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={cancel}
        disabled={pending}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-bad px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
        Confirm cancel
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="min-h-[44px] rounded-control px-3 text-sm font-semibold text-fg-2 hover:bg-hover"
      >
        Keep load
      </button>
    </span>
  )
}

/** One-tap check-call logging for the brokers who still phone in. */
export function CheckCallButton({ loadId }: { loadId: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  const log = (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    startTransition(async () => {
      const result = await logCheckCallAction(loadId, note)
      if (result.ok) {
        toast.success("Check call logged")
        setNote("")
        setOpen(false)
      } else {
        toast.error(result.error ?? "Could not log call")
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
      >
        <MessageSquare className="h-4 w-4" /> Check call
      </button>
    )
  }
  return (
    <form onSubmit={log} className="flex w-full sm:w-auto items-center gap-2">
      <input
        autoFocus
        aria-label="Check call note"
        placeholder="Broker called — truck 30 min out…"
        className={`${fieldCls} sm:w-72`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        type="submit"
        disabled={pending || !note.trim()}
        className="min-h-[44px] shrink-0 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="min-h-[44px] shrink-0 rounded-control px-3 text-sm font-semibold text-fg-2 hover:bg-hover"
      >
        Cancel
      </button>
    </form>
  )
}

export function StopTimestampButton({
  stopId,
  loadId,
  field,
  done,
}: {
  stopId: string
  loadId: string
  field: "arrived_at" | "departed_at"
  done: boolean
}) {
  const [pending, startTransition] = useTransition()
  if (done) return null

  const label = field === "arrived_at" ? "Mark arrived" : "Mark departed"
  const record = () =>
    startTransition(async () => {
      const result = await stopTimestampAction(stopId, loadId, field)
      if (result.ok) {
        const detention = result.detentionAppliedCents
          ? ` — detention billed: $${(result.detentionAppliedCents / 100).toFixed(2)}`
          : ""
        toast.success((field === "arrived_at" ? "Arrival recorded" : "Departure recorded") + detention)
      } else toast.error(result.error ?? "Could not record time")
    })

  return (
    <button
      onClick={record}
      disabled={pending}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border-strong px-3 text-xs font-semibold text-fg-2 hover:bg-hover disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {label}
    </button>
  )
}
