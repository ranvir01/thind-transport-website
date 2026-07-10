"use client"

import { useRef, useState, useTransition } from "react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Rocket, ShieldCheck } from "lucide-react"
import { createWorkspaceAction, verifyCarrierAuthorityAction, type CarrierAuthorityCheck } from "@/app/hub/_actions/onboarding"
import { fieldCls, labelCls } from "@/components/hub/ui"

/**
 * Onboarding wizard (phase-7 M11): company facts → branding → owner account.
 * One server action at the end — earlier steps hold state client-side so an
 * abandoned signup persists nothing.
 */
const STEPS = ["Company", "Branding", "Your account"] as const

const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: "Amber", value: "#d97706" },
  { name: "Blue", value: "#2563eb" },
  { name: "Teal", value: "#0891b2" },
  { name: "Green", value: "#059669" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Red", value: "#dc2626" },
]

export function SignupForm() {
  const [pending, startTransition] = useTransition()
  const [verifying, startVerify] = useTransition()
  const [step, setStep] = useState(0)
  const [authority, setAuthority] = useState<CarrierAuthorityCheck | null>(null)
  const [authorityError, setAuthorityError] = useState<string | null>(null)
  const [accent, setAccent] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
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

  // Only the current step's inputs are mounted, so native validation scopes itself.
  const next = () => {
    if (formRef.current && !formRef.current.reportValidity()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step < STEPS.length - 1) {
      next()
      return
    }
    startTransition(async () => {
      const result = await createWorkspaceAction({ ...form, accent: accent ?? undefined })
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
    <form ref={formRef} onSubmit={submit} className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-3">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
        <div className="mt-1.5 flex gap-1" aria-hidden>
          {STEPS.map((label, i) => (
            <span key={label} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <>
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
            <label htmlFor="su-phone" className={labelCls}>Company phone</label>
            <input id="su-phone" type="tel" className={fieldCls} autoComplete="tel" placeholder="(253) 555-0100"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <p className="text-body-sm text-fg-2">
            Pick an accent color for your workspace — it shows on your invoices, settlement PDFs,
            and the driver app. Skip it and you get the standard look; change it anytime.
          </p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Accent color">
            {ACCENT_PRESETS.map((preset) => {
              const selected = accent === preset.value
              return (
                <button
                  key={preset.value} type="button" role="radio" aria-checked={selected}
                  onClick={() => setAccent(selected ? null : preset.value)}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-control border text-xs font-medium text-fg-2 ${selected ? "border-accent bg-surface-2" : "border-border hover:border-fg-3"}`}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-black/10" style={{ backgroundColor: preset.value }}>
                    {selected && <Check className="h-4 w-4 p-0.5 text-white" />}
                  </span>
                  {preset.name}
                </button>
              )
            })}
          </div>
          {accent && (
            <p className="text-xs text-fg-3">
              Invoices, PDFs, and the driver app will use{" "}
              <span className="font-semibold" style={{ color: accent }}>this color</span>.
            </p>
          )}
        </>
      )}

      {step === 2 && (
        <>
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
        </>
      )}

      <div className="flex gap-2 pt-1">
        {step > 0 && (
          <button
            type="button" onClick={() => setStep((s) => s - 1)}
            className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-control border border-border px-4 text-sm font-medium text-fg-2 hover:border-fg-3"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button" onClick={next}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-semibold text-sm text-accent-fg hover:bg-accent-hover"
          >
            {step === 1 && !accent ? "Skip for now" : "Continue"} <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit" disabled={pending}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Create the workspace
          </button>
        )}
      </div>
    </form>
  )
}
