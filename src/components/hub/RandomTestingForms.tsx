"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Shuffle } from "lucide-react"
import {
  recordRandomTestResultAction, runRandomTestSelectionAction,
} from "@/app/hub/_actions/random-testing"
import { fieldCls, labelCls } from "@/components/hub/ui"
import type { TestType } from "@/lib/hub/random-testing"

export function RunSelectionButton({ testType }: { testType: TestType }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await runRandomTestSelectionAction(testType)
          if (result.ok) {
            toast.success(result.error ?? `${testType} pool updated and drivers notified`)
            router.refresh()
          } else toast.error(result.error ?? "Failed")
        })
      }
      disabled={pending}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-4 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
      Run {testType} selection
    </button>
  )
}

export function RecordResultForm({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"completed" | "refused" | "no_show">("completed")
  const [result, setResult] = useState<"negative" | "positive" | "refused" | "">("")
  const [completedOn, setCompletedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState("")

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="min-h-[36px] rounded-control border border-border-strong px-3 text-body-xs font-semibold text-fg-2 hover:bg-hover"
      >
        Record result
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const r = await recordRandomTestResultAction(id, {
            status, result: status === "completed" ? result : "",
            completedOn, notes,
          })
          if (r.ok) {
            toast.success("Result recorded")
            setOpen(false)
            router.refresh()
          } else toast.error(r.error ?? "Failed")
        })
      }}
      className="flex flex-col gap-2 rounded-card border border-border p-3 sm:flex-row sm:items-end sm:flex-wrap"
    >
      <div>
        <label className={labelCls}>Outcome</label>
        <select
          className={`${fieldCls} w-40`} value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="completed">Completed</option>
          <option value="refused">Refused</option>
          <option value="no_show">No-show</option>
        </select>
      </div>
      {status === "completed" ? (
        <div>
          <label className={labelCls}>Result</label>
          <select
            className={`${fieldCls} w-36`} value={result}
            onChange={(e) => setResult(e.target.value as typeof result)}
          >
            <option value="">— pending —</option>
            <option value="negative">Negative</option>
            <option value="positive">Positive</option>
          </select>
        </div>
      ) : null}
      <div>
        <label className={labelCls}>Date</label>
        <input type="date" className={`${fieldCls} w-40`} value={completedOn} onChange={(e) => setCompletedOn(e.target.value)} />
      </div>
      <div className="min-w-[10rem] flex-1">
        <label className={labelCls}>Notes</label>
        <input className={fieldCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Collection site, chain-of-custody #…" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-[36px] rounded-control bg-accent px-4 text-body-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-[36px] rounded-control border border-border-strong px-4 text-body-xs font-semibold text-fg-2 hover:bg-hover">
          Cancel
        </button>
      </div>
    </form>
  )
}
