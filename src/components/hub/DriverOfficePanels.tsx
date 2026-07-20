"use client"

/** Office-side driver panels: request paperwork (E3) and time-off decisions (E5). */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, FileQuestion, Loader2, Mail, X } from "lucide-react"
import {
  cancelDocumentRequestAction, decideTimeOffAction, requestDocumentAction,
} from "@/app/hub/_actions/comms"
import { resendDriverInviteAction } from "@/app/hub/_actions/people"
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
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null)

  const cancelRequest = (id: string) =>
    startTransition(async () => {
      const result = await cancelDocumentRequestAction(id)
      if (result.ok) router.refresh()
      else toast.error(result.error ?? "Failed")
      setConfirmingCancelId(null)
    })

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
        <FileQuestion className="h-4 w-4 text-accent-text" /> Ask for paperwork
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
              {confirmingCancelId === r.id ? (
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => cancelRequest(r.id)}
                    disabled={pending}
                    className="text-body-xs font-semibold text-bad hover:opacity-80 min-h-[32px] disabled:opacity-60"
                  >
                    Cancel it
                  </button>
                  <button
                    onClick={() => setConfirmingCancelId(null)}
                    disabled={pending}
                    className="text-body-xs font-semibold text-fg-3 hover:text-fg min-h-[32px]"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmingCancelId(r.id)}
                  className="text-body-xs font-semibold text-fg-3 hover:text-fg min-h-[32px]"
                >
                  Cancel
                </button>
              )}
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
    <Panel className="p-4 md:p-5 border-warn">
      <h2 className="text-[13.5px] font-semibold text-fg mb-3">
        Time-off requests waiting on you
      </h2>
      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 p-3">
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
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-ok-soft bg-ok-soft px-4 text-sm font-bold text-ok hover:opacity-90 disabled:opacity-60"
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

/**
 * First-send or resend the driver-app invite. Covers both gaps that had no
 * retry path: a manually-added driver who never got the bulk-import invite,
 * and a driver whose 7-day link expired before they used it.
 */
export function DriverAppAccessPanel({
  driverId,
  email,
  hasAccess,
}: {
  driverId: string
  email: string | null
  hasAccess: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (hasAccess) return null

  const send = () =>
    startTransition(async () => {
      const result = await resendDriverInviteAction(driverId)
      if (result.ok) {
        toast.success(`Invite sent to ${email}`)
        router.refresh()
      } else toast.error(result.error ?? "Could not send invite")
    })

  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
            <Mail className="h-4 w-4 text-accent-text" /> Driver app access
          </h2>
          <p className="mt-0.5 text-body-xs text-fg-3">
            {email
              ? "No app account yet — send a set-password link (valid 7 days)."
              : "Add an email address above to send an app invite."}
          </p>
        </div>
        <button
          onClick={send}
          disabled={pending || !email}
          className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-border-strong px-3 text-sm font-bold text-fg-2 hover:bg-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send invite
        </button>
      </div>
    </Panel>
  )
}
