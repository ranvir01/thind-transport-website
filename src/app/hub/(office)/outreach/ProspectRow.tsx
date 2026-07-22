"use client"

/**
 * One outreach prospect: generate an on-brand draft, review/edit it, then
 * Approve & send (human-gated). Reply/convert/opt-out keep the pipeline honest.
 * SMS + call script are copy-only — cold texting non-opted-in contacts is a
 * TCPA risk, so we hand the owner the words rather than auto-send.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Sparkles, Send, Phone, Mail, Copy, Check, Reply, UserCheck, Ban } from "lucide-react"
import { cn } from "@/lib/utils"
import { Pill } from "@/components/hub/ui"
import type { PillTone } from "@/components/hub/ui"
import {
  generateDraftAction, saveDraftAction, approveAndSendAction, setProspectStatusAction,
} from "@/app/hub/_actions/outreach"
import type { Prospect, ProspectStatus } from "@/lib/hub/outreach/prospects"

const STATUS_TONE: Record<ProspectStatus, PillTone> = {
  new: "accent", drafted: "warn", approved: "warn", sent: "info",
  replied: "ok", converted: "ok", unsubscribed: "neutral", bounced: "bad",
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }
        catch { toast.error("Copy failed") }
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2 py-1 text-body-xs font-semibold text-fg-2 hover:bg-hover"
    >
      {done ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />} {label}
    </button>
  )
}

export function ProspectRow({ prospect }: { prospect: Prospect }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState(prospect.draft_subject ?? "")
  const [body, setBody] = useState(prospect.draft_body ?? "")
  const [sms, setSms] = useState("")
  const [callScript, setCallScript] = useState("")

  const hasDraft = Boolean(subject && body)
  const suppressed = prospect.status === "unsubscribed" || prospect.status === "bounced"

  const generate = () =>
    startTransition(async () => {
      const res = await generateDraftAction(prospect.id)
      if (res.ok) {
        setSubject(res.subject); setBody(res.body); setSms(res.sms); setCallScript(res.callScript)
        setOpen(true)
        router.refresh()
      } else toast.error(res.error)
    })

  const save = () =>
    startTransition(async () => {
      const res = await saveDraftAction(prospect.id, subject, body)
      if (res.ok) toast.success("Draft saved")
      else toast.error(res.error)
    })

  const send = () =>
    startTransition(async () => {
      const res = await approveAndSendAction(prospect.id)
      if (res.ok) { toast.success("Sent"); router.refresh() }
      else toast.error(res.error)
    })

  const setStatus = (status: ProspectStatus, note: string) =>
    startTransition(async () => {
      const res = await setProspectStatusAction(prospect.id, status)
      if (res.ok) { toast.success(note); router.refresh() }
      else toast.error(res.error)
    })

  const telHref = prospect.phone ? `tel:${prospect.phone.replace(/[^0-9+]/g, "")}` : null
  const meta = [
    prospect.company, prospect.mc_number && `MC ${prospect.mc_number}`,
    prospect.lane, prospect.equipment, prospect.source,
  ].filter(Boolean).join(" · ")

  return (
    <div className="p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fg">{prospect.contact_name || prospect.company || prospect.email || "Unknown"}</span>
            <Pill tone={STATUS_TONE[prospect.status]}>{prospect.status}</Pill>
          </div>
          {meta && <p className="mt-0.5 text-body-xs text-fg-3">{meta}</p>}
          {prospect.email && <p className="text-body-xs text-fg-3">{prospect.email}</p>}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {prospect.email && (
            <a href={`mailto:${prospect.email}`} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border-strong px-2.5 text-body-xs font-semibold text-fg-2 hover:bg-hover">
              <Mail className="h-3.5 w-3.5" />
            </a>
          )}
          {telHref && (
            <a href={telHref} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border-strong px-2.5 text-body-xs font-semibold text-fg-2 hover:bg-hover">
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          {!suppressed && (
            <button
              onClick={hasDraft ? () => setOpen((o) => !o) : generate}
              disabled={pending}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-accent px-3 text-body-xs font-bold text-accent-fg hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {hasDraft ? (open ? "Hide draft" : "Review draft") : "Draft"}
            </button>
          )}
        </div>
      </div>

      {open && hasDraft && (
        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-fg-3">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mb-2 w-full rounded-lg border border-border-strong bg-surface p-2 text-body-sm text-fg focus:border-accent focus:outline-none"
          />
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-fg-3">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full rounded-lg border border-border-strong bg-surface p-2 font-mono text-body-xs leading-relaxed text-fg focus:border-accent focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button onClick={save} disabled={pending} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border-strong px-3 text-body-xs font-semibold text-fg hover:bg-hover disabled:opacity-60">
              Save
            </button>
            <button onClick={generate} disabled={pending} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border-strong px-3 text-body-xs font-semibold text-fg-2 hover:bg-hover disabled:opacity-60">
              <Sparkles className="h-3.5 w-3.5" /> Regenerate
            </button>
            <button onClick={send} disabled={pending} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-accent px-3 text-body-xs font-bold text-accent-fg hover:bg-accent-hover disabled:opacity-60">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Approve &amp; send
            </button>
            <CopyBtn text={`${subject}\n\n${body}`} label="Copy email" />
            {sms && <CopyBtn text={sms} label="Copy SMS" />}
            {callScript && <CopyBtn text={callScript} label="Copy call script" />}
          </div>
        </div>
      )}

      {/* Outcome tracking */}
      {(prospect.status === "sent" || prospect.status === "replied") && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {prospect.status === "sent" && (
            <button onClick={() => setStatus("replied", "Marked replied")} disabled={pending} className="inline-flex items-center gap-1 rounded-lg border border-ok-soft px-2.5 py-1 text-body-xs font-semibold text-ok hover:bg-ok-soft disabled:opacity-60">
              <Reply className="h-3.5 w-3.5" /> They replied
            </button>
          )}
          <button onClick={() => setStatus("converted", "Converted")} disabled={pending} className="inline-flex items-center gap-1 rounded-lg border border-ok-soft px-2.5 py-1 text-body-xs font-semibold text-ok hover:bg-ok-soft disabled:opacity-60">
            <UserCheck className="h-3.5 w-3.5" /> Converted
          </button>
          <button onClick={() => setStatus("unsubscribed", "Opted out")} disabled={pending} className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2.5 py-1 text-body-xs font-semibold text-fg-3 hover:bg-hover disabled:opacity-60">
            <Ban className="h-3.5 w-3.5" /> Opted out
          </button>
        </div>
      )}
    </div>
  )
}
