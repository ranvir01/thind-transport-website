"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HandCoins, Loader2 } from "lucide-react"
import { driverRequestAdvance } from "@/app/hub/_actions/driver"
import { fieldDarkCls } from "@/components/hub/ui"

export function AdvanceRequestForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ amount: "", note: "" })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await driverRequestAdvance(form)
      if (result.ok) {
        toast.success("Request sent — the office will answer here")
        setForm({ amount: "", note: "" })
        setOpen(false)
        router.refresh()
      } else toast.error(result.error ?? "Could not send")
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 font-display text-sm font-bold uppercase tracking-[0.06em] text-gold hover:bg-gold/20"
      >
        <HandCoins className="h-4 w-4" /> Ask for an advance
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-4 space-y-2">
      <p className="text-body-xs text-steel-200">
        Approved advances come off your next settlement — no surprises.
      </p>
      <input
        aria-label="Amount" required inputMode="decimal" placeholder="How much? ($)"
        className={fieldDarkCls} value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
      />
      <input
        aria-label="What for" placeholder="What's it for? (optional)"
        className={fieldDarkCls} value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
      />
      <div className="flex gap-2">
        <button
          type="button" onClick={() => setOpen(false)}
          className="flex-1 min-h-[48px] rounded-xl border border-white/15 text-sm font-semibold text-steel-200 hover:bg-white/5"
        >
          Never mind
        </button>
        <button
          type="submit" disabled={pending || !form.amount}
          className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-display text-sm font-bold uppercase tracking-[0.06em] text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send request
        </button>
      </div>
    </form>
  )
}
