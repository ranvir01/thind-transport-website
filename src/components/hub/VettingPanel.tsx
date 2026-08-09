"use client"

/** FMCSA vetting + payment behavior + double-brokering checklist (Phase 5). */
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ShieldCheck, ShieldQuestion, ShieldX } from "lucide-react"
import { cn } from "@/lib/utils"
import { vetCustomerAction } from "@/app/hub/_actions/vetting"
import { Panel } from "@/components/hub/ui"
import { DOUBLE_BROKER_CHECKLIST } from "@/lib/hub/vetting-shared"

export interface VettingView {
  configured: boolean
  snapshot: {
    allowed_to_operate: boolean | null
    authority_status: string | null
    legal_name: string | null
    risk_score: number | null
    risk_reasons: string[]
    checked_at: string
  } | null
  paySpeed: { avgDays: number | null; samples: number; trend: number | null; slowPayer: boolean }
}

export function VettingPanel({ customerId, view }: { customerId: string; view: VettingView }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const verify = () =>
    startTransition(async () => {
      const result = await vetCustomerAction(customerId)
      if (result.ok) {
        toast.success("Authority checked against FMCSA")
        router.refresh()
      } else toast.error(result.error ?? "Vetting failed")
    })

  const snapshot = view.snapshot
  const score = snapshot?.risk_score

  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
          {snapshot?.allowed_to_operate === false ? (
            <ShieldX className="h-4 w-4 text-bad" />
          ) : snapshot?.allowed_to_operate === true ? (
            <ShieldCheck className="h-4 w-4 text-ok" />
          ) : (
            <ShieldQuestion className="h-4 w-4 text-warn" />
          )}
          Vetting
        </h2>
        <button
          onClick={verify}
          disabled={pending}
          className="flex min-h-[40px] items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {snapshot ? "Re-check now" : "Verify authority"}
        </button>
      </div>

      {!view.configured ? (
        <p className="mb-3 rounded-control border border-border bg-surface-2 px-3 py-2 text-body-xs text-fg-3">
          Live FMCSA checks need a free webkey (5 minutes at mobile.fmcsa.dot.gov) — set
          <code className="mx-1 text-accent-text">FMCSA_WEBKEY</code> and every broker gets verified
          automatically, plus a nightly re-check.
        </p>
      ) : null}

      {snapshot ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-display text-3xl font-extrabold",
                (score ?? 0) >= 70 ? "text-ok" : (score ?? 0) >= 40 ? "text-warn" : "text-bad"
              )}
            >
              {score ?? "—"}
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">Risk score / 100</p>
              <p className="text-[11px] text-fg-3">
                Checked {new Date(snapshot.checked_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {snapshot.legal_name ? ` · FMCSA name: ${snapshot.legal_name}` : ""}
              </p>
            </div>
          </div>
          <ul className="space-y-1">
            {snapshot.risk_reasons.map((reason, i) => (
              <li key={i} className="text-body-sm text-fg-2">• {reason}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-body-sm text-fg-3">Not verified yet.</p>
      )}

      {/* Own-receivables intelligence */}
      <div className="mt-3 rounded-card border border-border bg-surface-2 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-fg-3">How they pay you</p>
        {view.paySpeed.avgDays == null ? (
          <p className="mt-1 text-body-sm text-fg-3">No payment history yet.</p>
        ) : (
          <p className="mt-1 text-body-sm text-fg-2">
            Averages <span className={cn("font-bold", view.paySpeed.slowPayer ? "text-warn" : "text-ok")}>
              {view.paySpeed.avgDays} days
            </span>{" "}
            to pay ({view.paySpeed.samples} invoices)
            {view.paySpeed.trend != null
              ? view.paySpeed.trend > 1
                ? ` — getting slower (+${view.paySpeed.trend}d)`
                : view.paySpeed.trend < -1
                  ? ` — getting faster (${view.paySpeed.trend}d)`
                  : " — steady"
              : ""}
            {view.paySpeed.slowPayer ? ". Flagged as a slow payer." : ""}
          </p>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-body-sm font-semibold text-fg-3 hover:text-fg">
          Double-brokering red flags (read before the first load)
        </summary>
        <ul className="mt-2 space-y-1">
          {DOUBLE_BROKER_CHECKLIST.map((flag) => (
            <li key={flag} className="text-body-sm text-fg-2">⚠ {flag}</li>
          ))}
        </ul>
      </details>
    </Panel>
  )
}
