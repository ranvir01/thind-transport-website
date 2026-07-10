"use client"

import { useState, useTransition } from "react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Rocket, ShieldCheck } from "lucide-react"
import { createWorkspaceAction, verifyCarrierAuthorityAction, type CarrierAuthorityCheck } from "@/app/hub/_actions/onboarding"
import { fieldCls, labelCls } from "@/components/hub/ui"

export function SignupForm() {
  const [pending, startTransition] = useTransition()
  const [verifying, startVerify] = useTransition()
  const [authority, setAuthority] = useState<CarrierAuthorityCheck | null>(null)
  const [authorityError, setAuthorityError] = useState<string | null>(null)
  const [form, setForm] = useState({
    companyName: "", dotNumber: "", mcNumber: "", phone: "",
    ownerName: "", email: "", password: "",
  })

  const verify = () => {
    setAuthorityError(null)
    setAuthority(null)
    startVerify(async () => {
      const result = await verifyCarrierAuthorityAction({ dotNumber: form.dotNumber, mcNumber: form.mcNumber })
      if (!result.ok || !result.result) {
        setAuthorityError(result.error ?? "Could not verify that DOT/MC")
        return
      }
      setAuthority(result.result)
      if (!form.companyName.trim() && result.result.legalName) {
        setForm((f) => ({ ...f, companyName: result.result!.legalName ?? f.companyName }))
      }
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createWorkspaceAction(form)
      if (!result.ok) {
        toast.error(result.error ?? "Could not create the workspace")
        return
      }
      const signin = await signIn("credentials", {
        email: form.email, password: form.password, redirect: false,
      })
      window.location.href = signin?.ok ? "/hub" : "/hub/login"
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="su-company" className={labelCls}>Company name *</label>
        <input id="su-company" required className={fieldCls} placeholder="Cascade Lines LLC"
          value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="su-dot" className={labelCls}>DOT #</label>
          <input id="su-dot" className={fieldCls} inputMode="numeric"
            value={form.dotNumber}
            onChange={(e) => { setForm({ ...form, dotNumber: e.target.value }); setAuthority(null); setAuthorityError(null) }} />
        </div>
        <div>
          <label htmlFor="su-mc" className={labelCls}>MC #</label>
          <input id="su-mc" className={fieldCls} inputMode="numeric"
            value={form.mcNumber}
            onChange={(e) => { setForm({ ...form, mcNumber: e.target.value }); setAuthority(null); setAuthorityError(null) }} />
        </div>
      </div>
      <button
        type="button" onClick={verify} disabled={verifying || (!form.dotNumber.trim() && !form.mcNumber.trim())}
        className="flex min-h-[32px] items-center gap-1.5 py-1 text-xs font-medium text-accent-text hover:underline disabled:opacity-50 disabled:no-underline"
      >
        {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        Verify with FMCSA
      </button>
      {authority && (
        <p className={`flex items-center gap-1.5 text-xs ${authority.allowedToOperate === false ? "text-bad" : "text-ok"}`}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {authority.legalName ?? "Carrier"} — {authority.allowedToOperate === false ? "not currently allowed to operate" : "authority on file"}
        </p>
      )}
      {authorityError && <p className="text-xs text-warn">{authorityError}</p>}
      <div>
        <label htmlFor="su-owner" className={labelCls}>Your name *</label>
        <input id="su-owner" required className={fieldCls} autoComplete="name"
          value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
      </div>
      <div>
        <label htmlFor="su-email" className={labelCls}>Email *</label>
        <input id="su-email" required type="email" className={fieldCls} autoComplete="email"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label htmlFor="su-pass" className={labelCls}>Password (8+ characters) *</label>
        <input id="su-pass" required type="password" minLength={8} className={fieldCls} autoComplete="new-password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <button
        type="submit" disabled={pending}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
        Create the workspace
      </button>
    </form>
  )
}
