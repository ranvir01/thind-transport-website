"use client"

/**
 * Office claim entry/edit. Cargo claims live or die on the Carmack filing
 * deadline (delivery + 9 months), so the deadline field talks back: it shows
 * how many days are left as you set it.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, CalendarClock } from "lucide-react"
import { saveClaim, type ClaimFormInput } from "@/app/hub/_actions/safety"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export interface ClaimFormState {
  kind: ClaimFormInput["kind"]
  status: ClaimFormInput["status"]
  loadId: string
  incidentId: string
  amount: string
  filingDeadline: string
  notes: string
}

const KIND_OPTIONS: { value: ClaimFormState["kind"]; label: string; hint: string }[] = [
  { value: "cargo", label: "Cargo", hint: "Freight damaged, short, or lost (OS&D)" },
  { value: "property", label: "Property", hint: "Damage to someone's property or equipment" },
  { value: "injury", label: "Injury", hint: "Bodily injury claim against the carrier" },
]

function daysLeft(deadline: string): number | null {
  if (!deadline) return null
  const d = new Date(`${deadline}T00:00:00`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

export function ClaimForm({
  claimId,
  initial,
  loads,
  incidents,
}: {
  claimId: string | null
  initial: ClaimFormState
  loads: { id: string; label: string }[]
  incidents: { id: string; label: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<ClaimFormState>(initial)

  const remaining = daysLeft(form.filingDeadline)
  const deadlineUrgent =
    remaining !== null && remaining <= 30 && (form.status === "open" || form.status === "filed")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveClaim(claimId, {
        kind: form.kind,
        status: form.status,
        loadId: form.loadId || null,
        incidentId: form.incidentId || null,
        amount: form.amount,
        filingDeadline: form.filingDeadline || null,
        notes: form.notes || null,
      })
      if (result.ok) {
        toast.success(claimId ? "Claim updated" : "Claim opened")
        router.push("/hub/safety/claims")
        router.refresh()
      } else toast.error(result.error ?? "Could not save")
    })
  }

  return (
    <Panel className="p-4 md:p-6 max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className={labelCls}>What kind of claim</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
            {KIND_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer flex-col rounded-xl border p-3 min-h-[44px]",
                  form.kind === opt.value
                    ? "border-accent bg-accent/5"
                    : "border-border hover:bg-hover"
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={opt.value}
                  checked={form.kind === opt.value}
                  onChange={() => setForm({ ...form, kind: opt.value })}
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-fg">{opt.label}</span>
                <span className="text-body-xs text-fg-3">{opt.hint}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="claimLoad" className={labelCls}>Load (if any)</label>
            <select
              id="claimLoad" className={fieldCls} value={form.loadId}
              onChange={(e) => setForm({ ...form, loadId: e.target.value })}
            >
              <option value="">—</option>
              {loads.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="claimIncident" className={labelCls}>Incident (if any)</label>
            <select
              id="claimIncident" className={fieldCls} value={form.incidentId}
              onChange={(e) => setForm({ ...form, incidentId: e.target.value })}
            >
              <option value="">—</option>
              {incidents.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="claimAmount" className={labelCls}>Claimed amount ($)</label>
            <input
              id="claimAmount" inputMode="decimal" placeholder="0.00" className={fieldCls}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="claimDeadline" className={labelCls}>Filing deadline</label>
            <input
              id="claimDeadline" type="date" className={fieldCls}
              value={form.filingDeadline}
              onChange={(e) => setForm({ ...form, filingDeadline: e.target.value })}
            />
          </div>
        </div>

        {remaining !== null ? (
          <p
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
              deadlineUrgent
                ? "bg-warn-soft text-warn border border-warn-soft"
                : "bg-surface-2 text-fg-2"
            )}
          >
            <CalendarClock className="h-4 w-4 shrink-0" />
            {remaining < 0
              ? `Filing deadline passed ${-remaining} day${remaining === -1 ? "" : "s"} ago.`
              : remaining === 0
                ? "Filing deadline is TODAY."
                : `${remaining} day${remaining === 1 ? "" : "s"} left to file. Cargo claims: Carmack allows 9 months from delivery.`}
          </p>
        ) : null}

        <div>
          <label htmlFor="claimNotes" className={labelCls}>Notes</label>
          <textarea
            id="claimNotes" rows={3} className={fieldCls}
            placeholder="What's damaged/short, claim numbers, adjuster contacts, next step…"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="claimStatus" className={labelCls}>Status</label>
          <select
            id="claimStatus" className={fieldCls} value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ClaimFormState["status"] })}
          >
            <option value="open">Open — being worked, not yet filed</option>
            <option value="filed">Filed — submitted to the broker/insurer</option>
            <option value="settled">Settled — paid out</option>
            <option value="denied">Denied</option>
            <option value="closed">Closed — no claim pursued</option>
          </select>
        </div>

        <button
          type="submit" disabled={pending}
          className="flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent px-6 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {claimId ? "Save changes" : "Open claim"}
        </button>
      </form>
    </Panel>
  )
}
