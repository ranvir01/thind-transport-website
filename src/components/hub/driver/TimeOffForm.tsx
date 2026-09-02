"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarPlus, Loader2 } from "lucide-react"
import { driverCancelTimeOff, driverRequestTimeOff } from "@/app/hub/_actions/driver"
import { isOfflineError, runOrQueue } from "@/components/hub/driver/offline-queue"
import { btnDriverPrimaryCls, fieldDarkCls, labelDarkCls } from "@/components/hub/ui"
import { TIME_OFF_KINDS, TIME_OFF_KIND_LABELS } from "@/lib/hub/types"

export function TimeOffForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ startDate: "", endDate: "", kind: "home_time", reason: "" })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      // A driver planning home time from a dead-signal truck stop must not
      // lose the tap — same offline queue as the DVIR and incident forms.
      const result = await runOrQueue({ kind: "time-off", payload: form }, () =>
        driverRequestTimeOff(form)
      )
      if ("queued" in result) {
        // No router.refresh on the queued path — it needs the network it doesn't have.
        toast.success("No signal — request saved on your phone, sends automatically")
        setForm({ startDate: "", endDate: "", kind: "home_time", reason: "" })
      } else if (result.ok) {
        toast.success("Request sent — the office will answer here")
        setForm({ startDate: "", endDate: "", kind: "home_time", reason: "" })
        router.refresh()
      } else toast.error(result.error ?? "Could not send")
    })
  }

  return (
    <form onSubmit={submit} className="driver-card space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="to-start" className={labelDarkCls}>First day off</label>
          <input
            id="to-start" type="date" required className={fieldDarkCls}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate || e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="to-end" className={labelDarkCls}>Last day off</label>
          <input
            id="to-end" type="date" required className={fieldDarkCls} min={form.startDate}
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label htmlFor="to-kind" className={labelDarkCls}>What kind</label>
        <select
          id="to-kind" className={fieldDarkCls} value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
        >
          {TIME_OFF_KINDS.map((k) => (
            <option key={k} value={k}>{TIME_OFF_KIND_LABELS[k]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="to-reason" className={labelDarkCls}>Anything the office should know? (optional)</label>
        <input
          id="to-reason" className={fieldDarkCls} placeholder="Kid's birthday, doctor, family…"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
      </div>
      <button
        type="submit" disabled={pending}
        className={btnDriverPrimaryCls}
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CalendarPlus className="h-5 w-5" />}
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
          // Cancels are NOT queued offline: a queued cancel replayed hours
          // later could race an office approval. Fail honestly instead.
          try {
            const result = await driverCancelTimeOff(id)
            if (result.ok) {
              toast.success("Request cancelled")
              router.refresh()
            } else toast.error(result.error ?? "Could not cancel")
          } catch (err) {
            toast.error(
              isOfflineError(err)
                ? "No signal — cancelling needs a connection, try again later"
                : "Could not cancel"
            )
          }
        })
      }
      disabled={pending}
      className="mt-2 min-h-[44px] text-[13px] font-semibold text-steel-300 hover:text-white"
    >
      Cancel this request
    </button>
  )
}
