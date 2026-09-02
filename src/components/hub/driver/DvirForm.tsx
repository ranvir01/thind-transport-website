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
import { Check, Loader2, ShieldAlert, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { submitDvirAction } from "@/app/hub/_actions/dvir"
import { runOrQueue } from "@/components/hub/driver/offline-queue"
import { SignaturePad } from "@/components/hub/SignaturePad"
import {
  btnDriverPrimaryCls, btnDriverSecondaryCls, fieldDarkCls, labelDarkCls,
} from "@/components/hub/ui"
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
  // After an offline queue, lock re-submit so a second tap can't enqueue a
  // duplicate DVIR. TimeOff/Advance clear their forms; this one stays readable
  // (the driver may want to re-check what they signed) with the button parked.
  const [savedOffline, setSavedOffline] = useState(false)
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
        // same as the load card's queued path. Park the button instead: a signed form with a
        // live "File" invites a doubting driver to queue the same inspection twice.
        toast.success("No signal — inspection saved, sends automatically")
        setSavedOffline(true)
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

  return (
    <div className="space-y-4">
      {/* 396.13: review the prior post-trip + its repair certification */}
      {type === "pre" && priorDvir ? (
        <section
          className="driver-card p-4"
          style={{
            borderColor: "color-mix(in srgb, var(--driver-accent) 30%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--driver-accent) 6%, transparent)",
          }}
        >
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--driver-accent)]">
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
            priorDvir.repair_certified_at ? "text-green-400" : "text-orange-300"
          )}>
            {priorDvir.repair_certified_at
              ? `Repairs certified by ${priorDvir.repair_certified_by_name}. Your signature below confirms the truck is good to go.`
              : "Repairs NOT certified yet — this truck stays parked. Call the office."}
          </p>
        </section>
      ) : null}

      <section className="driver-card p-4">
        <p className="mb-1 text-[17px] font-semibold text-white">
          {type === "post" ? "End-of-day inspection" : "Pre-trip inspection"} — <span className="font-mono tabular-nums">#{truck.unit_number}</span>
        </p>
        <p className="mb-3 text-[13px] text-steel-300">Tap anything that has a problem.</p>
        <ul className="space-y-1.5">
          {checklistTemplate.map((item) => {
            const ok = checks[item.key]
            return (
              <li key={item.key}>
                <div className="flex min-h-[48px] items-center justify-between gap-3">
                  <span className="min-w-0 text-sm font-semibold text-white">{item.label}</span>
                  {/* Segmented control: one bordered group, `overflow-hidden` rounds the
                      inner buttons and is what the DVIR smoke measures for clipping. */}
                  <div role="group" aria-label={`${item.label} condition`} className="flex shrink-0 whitespace-nowrap rounded-control border border-white/15 overflow-hidden">
                    <button
                      type="button"
                      aria-pressed={ok}
                      onClick={() => setChecks({ ...checks, [item.key]: true })}
                      className={cn("min-h-[44px] px-4 text-sm font-semibold", ok ? "bg-green-500/25 text-green-300" : "text-steel-300 hover:bg-white/5")}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      aria-pressed={!ok}
                      onClick={() => setChecks({ ...checks, [item.key]: false })}
                      className={cn("min-h-[44px] px-4 text-sm font-semibold", !ok ? "bg-orange/25 text-orange-300" : "text-steel-300 hover:bg-white/5")}
                    >
                      Problem
                    </button>
                  </div>
                </div>
                {!ok ? (
                  <input
                    placeholder="What's wrong? (short note)"
                    className={cn(fieldDarkCls, "mt-2")}
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
        <section className="rounded-card border border-orange/40 bg-orange/[0.07] p-4">
          <p className="flex items-center gap-2 text-base font-semibold text-orange-300">
            <ShieldAlert className="h-5 w-5 shrink-0" /> Is the truck still safe to drive?
          </p>
          <p className="mt-1 text-[13px] text-steel-200">
            Answer honestly — &quot;No&quot; parks the truck until the shop signs off. That&apos;s the law working, not you in trouble.
          </p>
          <div role="group" aria-label="Safe to operate" className="mt-3 flex gap-3">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={safeToOperate === value}
                onClick={() => setSafeToOperate(value)}
                className={cn(
                  btnDriverSecondaryCls,
                  "flex-1",
                  safeToOperate === value
                    ? value
                      ? "border-green-500/50 bg-green-500/20 text-green-300"
                      : "border-orange bg-orange/20 text-orange-300"
                    : "text-steel-200"
                )}
              >
                {value ? "Yes — safe to operate" : "No — park it"}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="driver-card p-4">
        <p className={labelDarkCls}>Sign the report</p>
        <SignaturePad onChange={setSignature} height={110} variant="dark" />
        <button
          onClick={submit}
          disabled={pending || savedOffline || !signature}
          className={cn(btnDriverPrimaryCls, "mt-3")}
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {savedOffline
            ? "Saved on your phone"
            : `File the ${type === "post" ? "post-trip" : "pre-trip"}`}
        </button>
        {savedOffline ? (
          <p className="mt-2 text-center text-[13px] text-steel-300">
            Sends automatically when you have signal — no need to tap again.
          </p>
        ) : null}
      </section>
    </div>
  )
}
