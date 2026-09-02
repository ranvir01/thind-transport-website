"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HandCoins, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { driverRequestAdvance } from "@/app/hub/_actions/driver"
import { runOrQueue } from "@/components/hub/driver/offline-queue"
import { btnDriverPrimaryCls, btnDriverSecondaryCls, fieldDarkCls } from "@/components/hub/ui"
import { dollarsToCents } from "@/lib/hub/types"

export function AdvanceRequestForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ amount: "", note: "" })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mirror the server's amount rules before queueing — a bad amount queued
    // offline would be rejected silently at replay, long after the driver
    // could fix it.
    const amountCents = dollarsToCents(form.amount)
    if (amountCents <= 0) return void toast.error("How much do you need?")
    if (amountCents > 100000) return void toast.error("Over $1,000 — call the office instead")
    startTransition(async () => {
      const result = await runOrQueue({ kind: "advance", payload: form }, () =>
        driverRequestAdvance(form)
      )
      if ("queued" in result) {
        // No router.refresh on the queued path — it needs the network it doesn't have.
        toast.success("No signal — request saved on your phone, sends automatically")
        setForm({ amount: "", note: "" })
        setOpen(false)
      } else if (result.ok) {
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
        className={cn(btnDriverSecondaryCls, "text-[color:var(--driver-accent)]")}
        style={{
          borderColor: "color-mix(in srgb, var(--driver-accent) 40%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--driver-accent) 10%, transparent)",
        }}
      >
        <HandCoins className="h-5 w-5" /> Ask for an advance
      </button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="driver-card space-y-3 p-4"
      style={{
        borderColor: "color-mix(in srgb, var(--driver-accent) 30%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--driver-accent) 5%, transparent)",
      }}
    >
      <p className="text-[13px] text-steel-200">
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
      <div className="flex gap-3">
        <button
          type="button" onClick={() => setOpen(false)}
          className={cn(btnDriverSecondaryCls, "flex-1")}
        >
          Never mind
        </button>
        <button
          type="submit" disabled={pending || !form.amount}
          className={cn(btnDriverPrimaryCls, "flex-1")}
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Send request
        </button>
      </div>
    </form>
  )
}
