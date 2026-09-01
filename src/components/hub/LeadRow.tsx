"use client"

/**
 * One website lead: contact links that work from a phone (tap-to-call,
 * tap-to-text, mailto) and a one-tap status flow. Speed-to-lead is the whole
 * game in driver recruiting — every affordance here is about calling within
 * minutes, not managing a CRM.
 */
import { useTransition } from "react"
import { describeAttribution } from "@/lib/attribution"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2, Mail, MessageSquare, Phone, UserPlus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { promoteLeadAction, setLeadStatusAction } from "@/app/hub/_actions/leads"
import type { WebsiteLead } from "@/lib/hub/website-leads"

const STATUS_TONE: Record<WebsiteLead["status"], string> = {
  new: "border-accent-soft bg-accent-soft text-accent-text",
  contacted: "border-ok-soft bg-ok-soft text-ok",
  closed: "border-border-strong bg-surface-2 text-fg-3",
}

export function LeadRow({ lead }: { lead: WebsiteLead }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const telHref = lead.phone ? `tel:${lead.phone.replace(/[^0-9+]/g, "")}` : null
  const smsHref = lead.phone
    ? `sms:${lead.phone.replace(/[^0-9+]/g, "")}?body=${encodeURIComponent("Hi, this is Thind Transport — thanks for reaching out about driving with us. Good time to talk?")}`
    : null

  const setStatus = (status: WebsiteLead["status"]) =>
    startTransition(async () => {
      const result = await setLeadStatusAction(lead.id, status)
      if (result.ok) router.refresh()
      else toast.error(result.error ?? "Failed")
    })

  const promote = () =>
    startTransition(async () => {
      const result = await promoteLeadAction(lead.id)
      if (result.ok) {
        toast.success("Added to the recruiting pipeline")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not promote the lead")
      }
    })

  return (
    <div className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fg">{lead.name || lead.email}</span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              STATUS_TONE[lead.status]
            )}
          >
            {lead.status}
          </span>
        </div>
        <p className="mt-0.5 text-body-xs text-fg-3">
          {[
            lead.driver_type,
            lead.experience_years && `${lead.experience_years} exp`,
            lead.source,
            new Date(lead.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {lead.message ? <p className="mt-1 text-body-xs text-fg-2">{lead.message}</p> : null}
        {/* Where the visit came from, as opposed to which form they filled in.
            Only rendered when there is something to say — every lead showing
            "Direct / unknown" would be noise on a board scanned at a glance. */}
        {lead.attribution ? (
          <p className="mt-1 text-body-xs text-fg-3">↳ {describeAttribution(lead.attribution)}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {telHref ? (
          <a
            href={telHref}
            className="flex min-h-[40px] items-center gap-1.5 rounded-control bg-accent px-3 text-sm font-bold text-accent-fg hover:bg-accent-hover"
          >
            <Phone className="h-4 w-4" /> Call
          </a>
        ) : null}
        {smsHref ? (
          <a
            href={smsHref}
            className="flex min-h-[40px] items-center gap-1.5 rounded-control border border-border-strong px-3 text-sm font-semibold text-fg-2 hover:bg-hover"
          >
            <MessageSquare className="h-4 w-4" /> Text
          </a>
        ) : null}
        <a
          href={`mailto:${lead.email}`}
          className="flex min-h-[40px] items-center gap-1.5 rounded-control border border-border-strong px-3 text-sm font-semibold text-fg-2 hover:bg-hover"
          aria-label={`Email ${lead.email}`}
        >
          <Mail className="h-4 w-4" />
        </a>
        <button
          onClick={promote}
          disabled={pending}
          className="flex min-h-[40px] items-center gap-1.5 rounded-control border border-accent-soft bg-accent-soft px-3 text-sm font-semibold text-accent-text hover:opacity-90 disabled:opacity-60"
          title="Create an applicant in Recruiting from this lead"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Recruit
        </button>
        {lead.status === "new" ? (
          <button
            onClick={() => setStatus("contacted")}
            disabled={pending}
            className="flex min-h-[40px] items-center gap-1.5 rounded-control border border-ok-soft px-3 text-sm font-semibold text-ok hover:bg-ok-soft disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Contacted
          </button>
        ) : lead.status === "contacted" ? (
          <button
            onClick={() => setStatus("closed")}
            disabled={pending}
            className="flex min-h-[40px] items-center gap-1.5 rounded-control border border-border-strong px-3 text-sm font-semibold text-fg-3 hover:bg-hover disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Close
          </button>
        ) : null}
      </div>
    </div>
  )
}
