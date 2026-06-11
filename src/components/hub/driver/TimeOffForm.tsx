"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarPlus, Loader2 } from "lucide-react"
import { driverCancelTimeOff, driverRequestTimeOff } from "@/app/hub/_actions/driver"
import { fieldCls, labelCls } from "@/components/hub/ui"
import { TIME_OFF_KINDS, TIME_OFF_KIND_LABELS } from "@/lib/hub/types"

export function TimeOffForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ startDate: "", endDate: "", kind: "home_time", reason: "" })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await driverRequestTimeOff(form)
      if (result.ok) {
        toast.success("Request sent — the office will answer here")
        setForm({ startDate: "", endDate: "", kind: "home_time", reason: "" })
        router.refresh()
      } else toast.error(result.error ?? "Could not send")
    })
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-navy-800/80 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="to-start" className={labelCls}>First day off</label>
          <input
            id="to-start" type="date" required className={fieldCls}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate || e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="to-end" className={labelCls}>Last day off</label>
          <input
            id="to-end" type="date" required className={fieldCls} min={form.startDate}
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label htmlFor="to-kind" className={labelCls}>What kind</label>
        <select
          id="to-kind" className={fieldCls} value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
        >
          {TIME_OFF_KINDS.map((k) => (
            <option key={k} value={k}>{TIME_OFF_KIND_LABELS[k]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="to-reason" className={labelCls}>Anything the office should know? (optional)</label>
        <input
          id="to-reason" className={fieldCls} placeholder="Kid's birthday, doctor, family…"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
      </div>
      <button
        type="submit" disabled={pending}
        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-orange font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
        Ask for these days
      </button>
    </form>
  )
}

export function CancelTimeOffButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await driverCancelTimeOff(id)
          if (result.ok) {
            toast.success("Request cancelled")
            router.refresh()
          } else toast.error(result.error ?? "Could not cancel")
        })
      }
      disabled={pending}
      className="mt-2 text-body-xs font-semibold text-steel-300 hover:text-white min-h-[36px]"
    >
      Cancel this request
    </button>
  )
}
