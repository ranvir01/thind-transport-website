"use client"

/**
 * Driver DVIR form (49 CFR 396.11/.13) in plain words: big OK/Problem toggles
 * per inspection point, photos optional, safe-to-operate question, finger
 * signature. Pre-trips show the prior post-trip + repair certification to
 * review before signing (that signature releases a grounded truck).
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, CloudUpload, Loader2, ShieldAlert, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { submitDvirAction } from "@/app/hub/_actions/dvir"
import { runOrQueue } from "@/components/hub/driver/offline-queue"
import { SignaturePad } from "@/components/hub/SignaturePad"
import { fieldDarkCls, labelDarkCls } from "@/components/hub/ui"
import type { Dvir, DvirDefect } from "@/lib/hub/dvir"

export function DvirForm({
  truck,
  type,
  checklistTemplate,
  priorDvir,
}: {
  truck: { id: string; unit_number: string }
  type: "pre" | "post"
  checklistTemplate: { key: string; label: string }[]
  priorDvir: Dvir | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [queued, setQueued] = useState(false)
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(checklistTemplate.map((c) => [c.key, true]))
  )
  const [defectNotes, setDefectNotes] = useState<Record<string, string>>({})
  const [safeToOperate, setSafeToOperate] = useState(true)
  const [odometer, setOdometer] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  const defects: DvirDefect[] = checklistTemplate
    .filter((c) => !checks[c.key])
    .map((c) => ({ label: c.label, note: defectNotes[c.key] || "" }))

  // Same offline queue as the load card: no signal at the yard shouldn't lose a signed inspection.
  const submit = () =>
    startTransition(async () => {
      const input = {
        truckId: truck.id,
        type,
        odometer,
        checklist: checklistTemplate.map((c) => ({ ...c, ok: checks[c.key] })),
        defects,
        safeToOperate: defects.length === 0 ? true : safeToOperate,
        signature: signature ?? "",
        priorDvirId: priorDvir?.id ?? null,
      }
      const result = await runOrQueue({ kind: "dvir", payload: input }, () => submitDvirAction(input))
      if ("queued" in result) {
        // No navigation while offline — router.push/refresh needs the network it doesn't have,
        // same as the load card's queued path. Swap the form for a confirmation:
        // leaving it signed and armed lets a doubting driver queue a duplicate.
        toast.success("No signal — inspection saved, sends automatically")
        setQueued(true)
      } else if (result.ok) {
        toast.success(
          result.grounded
            ? "Filed — truck is grounded until the shop signs off. Good call."
            : "Inspection filed — drive safe"
        )
        router.push("/hub/driver")
        router.refresh()
      } else toast.error(result.error ?? "Could not file")
    })

  if (queued) {
    return (
      <div className="rounded-2xl border border-white/10 bg-navy-800/80 p-6 text-center">
        <CloudUpload className="mx-auto h-8 w-8 text-green-400" />
        <p className="mt-2 font-display text-base font-bold uppercase tracking-[0.08em] text-white">
          Inspection saved on your phone
        </p>
        <p className="mt-1 text-body-sm text-steel-200">
          It sends itself the moment you&apos;re back in signal — no need to file it again.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 396.13: review the prior post-trip + its repair certification */}
      {type === "pre" && priorDvir ? (
        <section className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gold">
            <Wrench className="h-4 w-4" /> Review before you roll
          </p>
          <p className="mt-1 text-body-sm text-steel-200">
            {priorDvir.driver_name} reported on{" "}
            {new Date(priorDvir.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}:
          </p>
          <ul className="mt-1 space-y-0.5">
            {priorDvir.defects.map((d, i) => (
              <li key={i} className="text-body-sm text-white">• {d.label}{d.note ? ` — ${d.note}` : ""}</li>
            ))}
          </ul>
          <p className={cn(
            "mt-2 text-body-sm font-semibold",
            priorDvir.repair_certified_at ? "text-green-400" : "text-orange"
          )}>
            {priorDvir.repair_certified_at
              ? `Repairs certified by ${priorDvir.repair_certified_by_name}. Your signature below confirms the truck is good to go.`
              : "Repairs NOT certified yet — this truck stays parked. Call the office."}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-navy-800/80 p-4">
        <p className="text-[13.5px] font-semibold text-white mb-1">
          {type === "post" ? "End-of-day inspection" : "Pre-trip inspection"} — #{truck.unit_number}
        </p>
        <p className="text-body-xs text-steel-400 mb-3">Tap anything that has a problem.</p>
        <ul className="space-y-1.5">
          {checklistTemplate.map((item) => {
            const ok = checks[item.key]
            return (
              <li key={item.key}>
                <div className="flex items-center justify-between gap-2 min-h-[48px]">
                  <span className="min-w-0 text-sm font-semibold text-white">{item.label}</span>
                  <div role="group" aria-label={`${item.label} condition`} className="flex shrink-0 whitespace-nowrap rounded-xl border border-white/15 overflow-hidden">
                    <button
                      type="button"
                      aria-pressed={ok}
                      onClick={() => setChecks({ ...checks, [item.key]: true })}
                      className={cn("min-h-[44px] px-4 text-sm font-bold", ok ? "bg-green-500/25 text-green-300" : "text-steel-400 hover:bg-white/5")}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      aria-pressed={!ok}
                      onClick={() => setChecks({ ...checks, [item.key]: false })}
                      className={cn("min-h-[44px] px-4 text-sm font-bold", !ok ? "bg-accent text-accent-fg" : "text-steel-400 hover:bg-white/5")}
                    >
                      Problem
                    </button>
                  </div>
                </div>
                {!ok ? (
                  <input
                    placeholder="What's wrong? (short note)"
                    className={`${fieldDarkCls} mt-1`}
                    value={defectNotes[item.key] ?? ""}
                    onChange={(e) => setDefectNotes({ ...defectNotes, [item.key]: e.target.value })}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>

        <div className="mt-3">
          <label htmlFor="dvir-odo" className={labelDarkCls}>Odometer (optional)</label>
          <input
            id="dvir-odo" inputMode="numeric" className={fieldDarkCls} placeholder="187,450"
            value={odometer} onChange={(e) => setOdometer(e.target.value)}
          />
        </div>
      </section>

      {defects.length > 0 ? (
        <section className="rounded-2xl border border-orange/40 bg-orange/[0.07] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-orange">
            <ShieldAlert className="h-4 w-4" /> Is the truck still safe to drive?
          </p>
          <p className="mt-1 text-body-xs text-steel-200">
            Answer honestly — &quot;No&quot; parks the truck until the shop signs off. That&apos;s the law working, not you in trouble.
          </p>
          <div role="group" aria-label="Safe to operate" className="mt-2 flex gap-2">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={safeToOperate === value}
                onClick={() => setSafeToOperate(value)}
                className={cn(
                  "flex-1 min-h-[48px] rounded-xl border text-sm font-bold",
                  safeToOperate === value
                    ? value
                      ? "border-green-500/50 bg-green-500/20 text-green-300"
                      : "border-orange bg-accent text-accent-fg"
                    : "border-white/15 text-steel-200 hover:bg-white/5"
                )}
              >
                {value ? "Yes — safe to operate" : "No — park it"}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-navy-800/80 p-4">
        <p className={labelDarkCls}>Sign the report</p>
        <SignaturePad onChange={setSignature} height={110} variant="dark" />
        <button
          onClick={submit}
          disabled={pending || !signature}
          className="mt-3 flex w-full min-h-[56px] items-center justify-center gap-2 rounded-control bg-accent font-display text-base font-bold uppercase tracking-[0.08em] text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          File the {type === "post" ? "post-trip" : "pre-trip"}
        </button>
      </section>
    </div>
  )
}
