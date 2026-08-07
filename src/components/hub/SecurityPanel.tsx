"use client"

/**
 * Two-factor auth enrollment — the settings-page card. Three states:
 * off → QR + confirm code → recovery codes shown exactly once. The recovery
 * codes screen refuses to go away until the user says they've saved them,
 * because "shown exactly once" is only honest if it was actually seen.
 */
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react"
import {
  beginTotpEnrollmentAction,
  confirmTotpEnrollmentAction,
  disableTotpAction,
  totpStatusAction,
} from "@/app/hub/_actions/security"
import { QrCode } from "@/components/hub/QrCode"
import { btnPrimaryCls, fieldCls, Panel } from "@/components/hub/ui"

type Stage =
  | { kind: "loading" }
  | { kind: "off" }
  | { kind: "enrolling"; otpauth: string; secret: string }
  | { kind: "recovery"; codes: string[] }
  | { kind: "on" }

export function SecurityPanel() {
  const [stage, setStage] = useState<Stage>({ kind: "loading" })
  const [code, setCode] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    totpStatusAction().then(
      (s) => setStage({ kind: s.enabled ? "on" : "off" }),
      () => setStage({ kind: "off" })
    )
  }, [])

  const begin = () =>
    startTransition(async () => {
      const r = await beginTotpEnrollmentAction()
      if (r.ok) setStage({ kind: "enrolling", otpauth: r.otpauth, secret: r.secret })
      else toast.error(r.error)
    })

  const confirm = () =>
    startTransition(async () => {
      const r = await confirmTotpEnrollmentAction(code)
      setCode("")
      if (r.ok) setStage({ kind: "recovery", codes: r.recoveryCodes })
      else toast.error(r.error)
    })

  const disable = () =>
    startTransition(async () => {
      const r = await disableTotpAction(code)
      setCode("")
      if (r.ok) {
        setStage({ kind: "off" })
        toast.success("Two-factor authentication turned off")
      } else toast.error(r.error ?? "Failed")
    })

  return (
    <Panel className="p-5">
      <div className="flex items-start gap-3">
        {stage.kind === "on" ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
        ) : (
          <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-fg-3" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-fg">Two-factor authentication</h2>

          {stage.kind === "loading" && <p className="mt-1 text-sm text-fg-2">Checking…</p>}

          {stage.kind === "off" && (
            <>
              <p className="mt-1 text-sm text-fg-2">
                A 6-digit code from your phone alongside your password. Works with Google
                Authenticator, 1Password, Authy — any authenticator app.
              </p>
              <button type="button" onClick={begin} disabled={pending} className={`mt-3 ${btnPrimaryCls}`}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Set up 2FA"}
              </button>
            </>
          )}

          {stage.kind === "enrolling" && (
            <div className="mt-2 space-y-3">
              <p className="text-sm text-fg-2">
                Scan with your authenticator app, then enter the code it shows to finish.
              </p>
              <QrCode value={stage.otpauth} label="2FA setup QR code" className="h-44 w-44 rounded-md" />
              <p className="text-xs text-fg-3 break-all">
                Can&apos;t scan? Enter this key manually: <code>{stage.secret}</code>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123 456"
                  className={`${fieldCls} max-w-[140px]`}
                  aria-label="6-digit code from your authenticator app"
                />
                <button type="button" onClick={confirm} disabled={pending || code.trim().length < 6} className={btnPrimaryCls}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Turn on"}
                </button>
              </div>
            </div>
          )}

          {stage.kind === "recovery" && (
            <div className="mt-2 space-y-3">
              <p className="text-sm font-medium text-fg">
                2FA is on. Save these recovery codes NOW — they are shown only once.
              </p>
              <p className="text-sm text-fg-2">
                Each works exactly once, in the same box as the 6-digit code, if you ever lose your phone.
              </p>
              <div className="grid grid-cols-2 gap-1.5 rounded-control border border-border bg-surface-2 p-3 font-mono text-sm text-fg sm:grid-cols-4">
                {stage.codes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(stage.codes.join("\n")).then(
                      () => toast.success("Recovery codes copied"),
                      () => toast.error("Copy failed — write them down instead")
                    )
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-border-strong bg-surface-2 px-4 text-sm font-medium text-fg hover:bg-hover"
                >
                  <Copy className="h-4 w-4" aria-hidden /> Copy all
                </button>
                <button type="button" onClick={() => setStage({ kind: "on" })} className={btnPrimaryCls}>
                  I saved them
                </button>
              </div>
            </div>
          )}

          {stage.kind === "on" && (
            <div className="mt-2 space-y-3">
              <p className="text-sm text-fg-2">
                On. At sign-in, enter the code from your authenticator app in the 2FA field.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Code to turn off"
                  className={`${fieldCls} max-w-[160px]`}
                  aria-label="Current 2FA code or a recovery code, to turn 2FA off"
                />
                <button
                  type="button"
                  onClick={disable}
                  disabled={pending || code.trim().length < 6}
                  className="inline-flex min-h-[44px] items-center rounded-control border border-border-strong bg-surface-2 px-4 text-sm font-medium text-fg hover:bg-hover"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Turn off 2FA"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
