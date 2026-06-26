"use client"

/**
 * Recruiting pipeline kanban (E5): drag applicants between stages,
 * reasons required on rejection, one-click pull from the public website.
 */
import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Download, GripVertical, Loader2, Plus, UserX } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  addApplicantAction, importPublicApplicantsAction, moveStageAction,
} from "@/app/hub/_actions/recruiting"
import { fieldCls } from "@/components/hub/ui"
import { APPLICANT_STAGES, STAGE_LABELS, type Applicant } from "@/lib/hub/recruiting-shared"

const SOURCE_BADGE: Record<string, string> = {
  public_site: "from the website",
  referral: "referral",
  manual: "",
}

export function RecruitingBoard({ applicants }: { applicants: Applicant[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<Applicant | null>(null)

  const columns = APPLICANT_STAGES.map((stage) => ({
    stage,
    items: applicants.filter((a) => a.stage === stage),
  }))
  const rejected = applicants.filter((a) => a.stage === "rejected")

  const drop = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData("text/plain")
    const applicant = applicants.find((a) => a.id === id)
    if (!applicant || applicant.stage === stage) return
    if (stage === "active") {
      toast.error("Open the applicant and use “Convert to driver” — hiring runs through the orientation gate")
      return
    }
    startTransition(async () => {
      const result = await moveStageAction(id, stage as Applicant["stage"])
      if (result.ok) {
        toast.success(`${applicant.first_name} → ${STAGE_LABELS[stage]}`)
        router.refresh()
      } else toast.error(result.error ?? "Could not move")
    })
  }

  const reject = (reason: string) => {
    if (!rejecting) return
    const applicant = rejecting
    setRejecting(null)
    startTransition(async () => {
      const result = await moveStageAction(applicant.id, "rejected", reason)
      if (result.ok) {
        toast.success(`${applicant.first_name} marked rejected`)
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })
  }

  return (
    <div>
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-3" style={{ minWidth: APPLICANT_STAGES.length * 230 }}>
          {columns.map(({ stage, items }) => (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(stage)
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => drop(e, stage)}
              className={cn(
                "w-[225px] shrink-0 rounded-xl border bg-bg-800/50 p-2 transition-colors",
                dragOver === stage ? "border-accent/60 bg-accent/[0.06]" : "border-border"
              )}
            >
              <p className="flex items-center justify-between px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-fg-3">
                {STAGE_LABELS[stage]}
                <span className="rounded-full bg-surface-2 px-1.5 text-fg-2">{items.length}</span>
              </p>
              <div className="space-y-1.5 min-h-[60px]">
                {items.map((a) => (
                  <div
                    key={a.id}
                    draggable={stage !== "active"}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                    className={cn(
                      "group rounded-lg border border-border bg-surface p-2.5",
                      stage !== "active" && "cursor-grab active:cursor-grabbing"
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <Link href={`/hub/recruiting/${a.id}`} className="min-w-0 font-semibold text-fg text-sm hover:underline">
                        {a.first_name} {a.last_name}
                      </Link>
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-steel-500" />
                    </div>
                    <p className="mt-0.5 text-[11px] text-fg-3 truncate">
                      {[
                        a.years_experience ? `${a.years_experience} yrs` : null,
                        a.cdl_state ? `CDL ${a.cdl_state}` : null,
                        SOURCE_BADGE[a.source] || null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    {a.referrer_name ? (
                      <p className="text-[10px] text-gold truncate">referred by {a.referrer_name}</p>
                    ) : null}
                    {stage !== "active" ? (
                      <button
                        onClick={() => setRejecting(a)}
                        className="mt-1 hidden items-center gap-1 text-[10px] font-semibold text-fg-3 hover:text-red-400 group-hover:flex"
                      >
                        <UserX className="h-3 w-3" /> Reject
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pending ? (
        <p className="flex items-center gap-2 text-body-xs text-fg-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
        </p>
      ) : null}

      {rejected.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-body-sm font-semibold text-fg-3 hover:text-fg">
            Rejected ({rejected.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {rejected.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-3 py-2 text-sm">
                <Link href={`/hub/recruiting/${a.id}`} className="text-fg-3 hover:text-fg">
                  {a.first_name} {a.last_name}
                </Link>
                <span className="text-[11px] text-fg-3 truncate">{a.rejected_reason}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* Rejection reason sheet */}
      {rejecting ? (
        <RejectSheet
          name={`${rejecting.first_name} ${rejecting.last_name}`}
          onCancel={() => setRejecting(null)}
          onConfirm={reject}
        />
      ) : null}
    </div>
  )
}

function RejectSheet({
  name,
  onCancel,
  onConfirm,
}: {
  name: string
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[13.5px] font-semibold text-fg">
          Rejecting {name}
        </p>
        <p className="mt-1 text-body-xs text-fg-3">
          A reason is required — future-you will want to know why.
        </p>
        <input
          autoFocus
          className={`${fieldCls} mt-3`}
          placeholder="Failed MVR review / no reefer experience / ghosted…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 min-h-[44px] rounded-xl border border-border-strong text-sm font-semibold text-fg-2 hover:bg-hover"
          >
            Keep them
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="flex-1 min-h-[44px] rounded-control bg-accent text-sm font-bold text-fg hover:bg-accent-hover disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

export function AddApplicantForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", yearsExperience: "" })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await addApplicantAction(form)
      if (result.ok) {
        toast.success("Applicant added to the pipeline")
        setForm({ firstName: "", lastName: "", phone: "", yearsExperience: "" })
        router.refresh()
      } else toast.error(result.error ?? "Could not add")
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <input
        aria-label="First name" placeholder="First name" className={`${fieldCls} !w-36`}
        value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
      />
      <input
        aria-label="Last name" placeholder="Last name" className={`${fieldCls} !w-36`}
        value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
      />
      <input
        aria-label="Phone" placeholder="Phone" className={`${fieldCls} !w-36`}
        value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <input
        aria-label="Years experience" placeholder="Yrs exp" className={`${fieldCls} !w-24`} inputMode="decimal"
        value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
      />
      <button
        type="submit" disabled={pending || !form.firstName.trim() || !form.lastName.trim()}
        className="flex min-h-[48px] items-center gap-1.5 rounded-control bg-accent px-4 font-display text-sm font-bold uppercase tracking-[0.06em] text-fg hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
      </button>
    </form>
  )
}

export function ImportApplicantsButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await importPublicApplicantsAction()
          if (result.ok) {
            toast.success(
              result.imported
                ? `${result.imported} new application(s) pulled from the website`
                : "No new website applications"
            )
            router.refresh()
          } else toast.error(result.error ?? "Import failed")
        })
      }
      disabled={pending}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-gold hover:bg-gold/20 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Pull website applications
    </button>
  )
}
