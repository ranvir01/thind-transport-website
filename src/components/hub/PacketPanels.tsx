"use client"

/** Carrier packet send + COI request forms, and the agreement e-sign panel. */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileSignature, Loader2, Mail, Send } from "lucide-react"
import { emailPacketAction, requestCoiAction, signAgreementAction } from "@/app/hub/_actions/packet"
import { SignaturePad } from "@/components/hub/SignaturePad"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"

export function SendPacketForm() {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ to: "", note: "" })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await emailPacketAction(form.to, form.note)
      if (result.ok) {
        toast.success(`Packet sent — ${result.attached} document(s) attached`)
        setForm({ to: "", note: "" })
      } else toast.error(result.error ?? "Could not send")
    })
  }

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-1">
        <Send className="h-4 w-4 text-gold" /> Send the packet
      </h2>
      <p className="text-body-xs text-fg-3 mb-3">
        One click emails the latest W-9, COI, authority letter, NOA, and agreement —
        onboarding speed wins loads.
      </p>
      <form onSubmit={submit} className="space-y-2">
        <input
          aria-label="Broker email" required type="email" placeholder="setup@newbroker.com"
          className={fieldCls} value={form.to}
          onChange={(e) => setForm({ ...form, to: e.target.value })}
        />
        <input
          aria-label="Note" placeholder="Optional note ('Packet for MC 876103, ref load #4411')"
          className={fieldCls} value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <button
          type="submit" disabled={pending || !form.to}
          className="flex min-h-[48px] items-center gap-2 rounded-control bg-accent px-6 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Email the packet
        </button>
      </form>
    </Panel>
  )
}

export function CoiRequestForm({ savedAgent }: { savedAgent: string }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ agentEmail: savedAgent, certificateHolder: "" })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await requestCoiAction(form)
      if (result.ok) {
        toast.success("COI request sent to your insurance agent")
        setForm({ ...form, certificateHolder: "" })
      } else toast.error(result.error ?? "Could not send")
    })
  }

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="text-[13.5px] font-semibold text-fg mb-1">
        Request a COI
      </h2>
      <p className="text-body-xs text-fg-3 mb-3">
        New broker wants to be the certificate holder? One click to your agent.
      </p>
      <form onSubmit={submit} className="space-y-2">
        <div>
          <label htmlFor="coi-agent" className={labelCls}>Insurance agent email</label>
          <input
            id="coi-agent" required type="email" className={fieldCls}
            value={form.agentEmail}
            onChange={(e) => setForm({ ...form, agentEmail: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="coi-holder" className={labelCls}>Certificate holder (name + address)</label>
          <textarea
            id="coi-holder" required rows={2} className={fieldCls}
            placeholder={"Pacific Crest Logistics\n410 Harbor Way, Portland OR 97201"}
            value={form.certificateHolder}
            onChange={(e) => setForm({ ...form, certificateHolder: e.target.value })}
          />
        </div>
        <button
          type="submit" disabled={pending}
          className="flex min-h-[48px] items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-6 font-display text-sm font-bold uppercase tracking-[0.08em] text-gold hover:bg-gold/20 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send the request
        </button>
      </form>
    </Panel>
  )
}

export function AgreementSignPanel({
  customerId,
  existingAgreement,
}: {
  customerId: string
  existingAgreement: { file_name: string; url: string; created_at: string } | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ signerName: "", signerTitle: "" })
  const [signature, setSignature] = useState<string | null>(null)

  if (existingAgreement) {
    return (
      <p className="flex items-center justify-between gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-sm">
        <span className="font-semibold text-green-400">
          Broker–carrier agreement signed{" "}
          {new Date(existingAgreement.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <a href={existingAgreement.url} target="_blank" rel="noreferrer" className="shrink-0 text-body-xs font-semibold text-fg-2 hover:text-fg underline">
          Open PDF
        </a>
      </p>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 font-display text-sm font-bold uppercase tracking-[0.06em] text-gold hover:bg-gold/20"
      >
        <FileSignature className="h-4 w-4" /> E-sign the broker–carrier agreement
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/[0.05] p-3 space-y-2">
      <p className="text-body-xs text-fg-2">
        The broker&apos;s rep signs with a finger — the signed PDF files itself on this customer.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          aria-label="Signer name" placeholder="Signer's name" className={fieldCls}
          value={form.signerName}
          onChange={(e) => setForm({ ...form, signerName: e.target.value })}
        />
        <input
          aria-label="Signer title" placeholder="Title (e.g. Carrier manager)" className={fieldCls}
          value={form.signerTitle}
          onChange={(e) => setForm({ ...form, signerTitle: e.target.value })}
        />
      </div>
      <SignaturePad onChange={setSignature} height={110} />
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 min-h-[44px] rounded-xl border border-border-strong text-sm font-semibold text-fg-2 hover:bg-hover"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            startTransition(async () => {
              const result = await signAgreementAction(customerId, {
                signerName: form.signerName,
                signerTitle: form.signerTitle,
                signature: signature ?? "",
              })
              if (result.ok) {
                toast.success("Agreement signed and filed")
                setOpen(false)
                router.refresh()
              } else toast.error(result.error ?? "Failed")
            })
          }
          disabled={pending || !signature || !form.signerName.trim()}
          className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent text-sm font-bold text-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign & file
        </button>
      </div>
    </div>
  )
}
