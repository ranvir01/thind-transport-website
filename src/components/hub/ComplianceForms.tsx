"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Plus } from "lucide-react"
import {
  addComplianceItemAction, computeIftaAction, importIftaRatesAction,
  resolveComplianceItemAction, setIftaStatusAction,
} from "@/app/hub/_actions/compliance"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"

export function AddComplianceItemForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ kind: "", dueOn: "", note: "" })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await addComplianceItemAction(form)
      if (result.ok) {
        toast.success("Item tracked")
        setForm({ kind: "", dueOn: "", note: "" })
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })
  }
  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
      <input
        aria-label="Item" required placeholder="2290 — Truck 101 / UCR 2027 / IFTA decals…"
        className={fieldCls} value={form.kind}
        onChange={(e) => setForm({ ...form, kind: e.target.value })}
      />
      <input
        aria-label="Due date" type="date" className={`${fieldCls} sm:w-44`} value={form.dueOn}
        onChange={(e) => setForm({ ...form, dueOn: e.target.value })}
      />
      <button type="submit" disabled={pending}
        className="min-h-[44px] shrink-0 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </button>
    </form>
  )
}

export function ResolveItemButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      aria-label="Mark done"
      onClick={() =>
        startTransition(async () => {
          const result = await resolveComplianceItemAction(id)
          if (result.ok) {
            toast.success("Done")
            router.refresh()
          } else toast.error(result.error ?? "Failed")
        })
      }
      disabled={pending}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-ok-soft text-ok hover:bg-ok-soft disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
    </button>
  )
}

export function IftaControls({ quarter, status }: { quarter: string; status: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const compute = () =>
    startTransition(async () => {
      const result = await computeIftaAction(quarter)
      if (result.ok) {
        toast.success("Quarter computed")
        if (result.error) toast.warning(result.error)
        router.refresh()
      } else toast.error(result.error ?? "Compute failed")
    })

  const setStatus = (next: "reviewed" | "filed") =>
    startTransition(async () => {
      const result = await setIftaStatusAction(quarter, next)
      if (result.ok) {
        toast.success(`Marked ${next}`)
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={compute} disabled={pending}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {status ? "Recompute" : "Compute quarter"}
      </button>
      {status === "draft" ? (
        <button onClick={() => setStatus("reviewed")} disabled={pending}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-info-soft bg-info-soft px-4 text-sm font-bold text-info hover:opacity-90 disabled:opacity-50">
          Mark reviewed
        </button>
      ) : null}
      {status === "reviewed" ? (
        <button onClick={() => setStatus("filed")} disabled={pending}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-ok-soft bg-ok-soft px-4 text-sm font-bold text-ok hover:opacity-90 disabled:opacity-50">
          Mark filed
        </button>
      ) : null}
    </div>
  )
}

export function IftaRatesImporter({ quarter }: { quarter: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [text, setText] = useState("")
  return (
    <Panel className="p-4">
      <label className={labelCls} htmlFor="rates_text">
        Import rates for {quarter} (one per line: <code>WA,0.4940</code> — surcharge states: <code>IN,0.5500,0.1100</code>)
      </label>
      <textarea
        id="rates_text" rows={4}
        className={`${fieldCls} h-auto py-2 font-mono text-xs`}
        placeholder={"WA,0.4940\nOR,0.0000\nID,0.3300\nCA,0.9080\nIN,0.5500,0.1100"}
        value={text} onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() =>
          startTransition(async () => {
            const result = await importIftaRatesAction(quarter, text)
            if (result.ok) {
              toast.success(`${result.id} rates saved`)
              setText("")
              router.refresh()
            } else toast.error(result.error ?? "Import failed")
          })
        }
        disabled={pending || !text.trim()}
        className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save rates
      </button>
    </Panel>
  )
}
