"use client"

/** Office-side driver panels: request paperwork (E3) and time-off decisions (E5). */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, FileQuestion, Loader2, X } from "lucide-react"
import {
  cancelDocumentRequestAction, decideTimeOffAction, requestDocumentAction,
} from "@/app/hub/_actions/comms"
import { fieldCls, Panel } from "@/components/hub/ui"
import { formatHubDateShort } from "@/lib/hub/format-dates"
import { TIME_OFF_KIND_LABELS, type DocumentRequest, type TimeOffRequest } from "@/lib/hub/types"

const REQUESTABLE = [
  { kind: "pod", label: "Signed POD" },
  { kind: "bol", label: "BOL" },
  { kind: "receipt", label: "Receipt (lumper/scale/fuel)" },
  { kind: "cdl", label: "CDL (renewal)" },
  { kind: "medical_card", label: "Medical card (renewal)" },
  { kind: "other", label: "Something else (explain in the note)" },
]

export function RequestDocumentPanel({
  driverId,
  loads,
  openRequests,
}: {
  driverId: string
  loads: { id: string; reference: string }[]
  openRequests: DocumentRequest[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ kind: "pod", loadId: "", note: "" })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await requestDocumentAction({
        driverId,
        kind: form.kind,
        loadId: form.loadId || undefined,
        note: form.note || undefined,
      })
      if (result.ok) {
        toast.success("Request pinned to the driver's phone until it's sent")
        setForm({ kind: "pod", loadId: "", note: "" })
        router.refresh()
      } else toast.error(result.error ?? "Could not send")
    })
  }

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-3">
        <FileQuestion className="h-4 w-4 text-gold" /> Ask for paperwork
      </h2>
      <form onSubmit={submit} className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            aria-label="What do you need" className={fieldCls} value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            {REQUESTABLE.map((r) => (
              <option key={r.kind} value={r.kind}>{r.label}</option>
            ))}
          </select>
          <select
            aria-label="For which load" className={fieldCls} value={form.loadId}
            onChange={(e) => setForm({ ...form, loadId: e.target.value })}
          >
            <option value="">Not load-specific</option>
            {loads.map((l) => (
              <option key={l.id} value={l.id}>{l.reference}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            aria-label="Note" className={fieldCls} placeholder="Optional note — “the one with the receiver's signature”"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <button
            type="submit" disabled={pending}
            className="min-h-[48px] shrink-0 rounded-control bg-accent px-5 font-display text-sm font-bold uppercase tracking-[0.06em] text-fg hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </button>
        </div>
      </form>

      {openRequests.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {openRequests.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="text-fg-2">
                Waiting on <span className="font-semibold text-fg">{r.kind.replace(/_/g, " ")}</span>
                {r.load_reference ? ` for ${r.load_reference}` : ""}
              </span>
              <button
                onClick={() =>
                  startTransition(async () => {
                    const result = await cancelDocumentRequestAction(r.id)
                    if (result.ok) router.refresh()
                    else toast.error(result.error ?? "Failed")
                  })
                }
                className="text-body-xs font-semibold text-fg-3 hover:text-fg min-h-[32px]"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  )
}

export function TimeOffDecisionPanel({ requests }: { requests: TimeOffRequest[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const decide = (id: string, decision: "approved" | "denied") =>
    startTransition(async () => {
      const result = await decideTimeOffAction(id, decision)
      if (result.ok) {
        toast.success(decision === "approved" ? "Approved — it now blocks the planner" : "Denied")
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })

  if (requests.length === 0) return null

  return (
    <Panel className="p-4 md:p-5 border-gold/30">
      <h2 className="text-[13.5px] font-semibold text-fg mb-3">
        Time-off requests waiting on you
      </h2>
      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white/[0.03] p-3">
            <div>
              <p className="font-semibold text-fg">
                {r.driver_name} — {formatHubDateShort(r.start_date)} to {formatHubDateShort(r.end_date)}
              </p>
              <p className="text-body-xs text-fg-3">
                {TIME_OFF_KIND_LABELS[r.kind]}
                {r.reason ? ` · “${r.reason}”` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => decide(r.id, "approved")}
                disabled={pending}
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-green-500/40 bg-green-500/10 px-4 text-sm font-bold text-green-400 hover:bg-green-500/20 disabled:opacity-60"
              >
                <Check className="h-4 w-4" /> Approve
              </button>
              <button
                onClick={() => decide(r.id, "denied")}
                disabled={pending}
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border-strong px-4 text-sm font-bold text-fg-2 hover:bg-hover disabled:opacity-60"
              >
                <X className="h-4 w-4" /> Deny
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
