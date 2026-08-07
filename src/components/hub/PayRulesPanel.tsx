"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus, RotateCcw, Trash2, Wallet } from "lucide-react"
import { savePayRulesAction, resetPayRulesAction } from "@/app/hub/_actions/pay-rules"
import { dollarsToCents } from "@/lib/hub/types"
import { btnPrimaryCls, btnSecondaryCls, fieldCls, labelCls, Panel, Pill } from "@/components/hub/ui"

/** Mirrors PayRule, but every amount is the string the input holds. */
type RuleDraft =
  | { type: "per_mile"; cents: string; loadedOnly: boolean }
  | { type: "percent_linehaul" | "percent_total" | "percent_accessorials" | "fsc_passthrough"; percent: string }
  | { type: "flat_per_load"; dollars: string }
  | { type: "per_stop"; dollars: string; afterStops: string }
  | { type: "referral_bonus" }

type DeductionDraft = {
  kind: "escrow" | "insurance" | "flat_recurring" | "percent_of_gross"
  dollars: string
  percent: string
  label: string
}

export interface PayRulesDriver {
  driverId: string
  driverName: string
  payType: "per_mile" | "percentage"
  isAuto: boolean
  ruleSet: { name: string; rules: unknown[]; deductions: unknown[] } | null
}

const RULE_LABELS: Record<string, string> = {
  per_mile: "Per mile",
  percent_linehaul: "% of linehaul",
  percent_total: "% of load total",
  percent_accessorials: "% of accessorials",
  fsc_passthrough: "Fuel surcharge passthrough",
  flat_per_load: "Flat per load",
  per_stop: "Per stop",
  referral_bonus: "Referral bonus",
  scorecard_bonus: "Scorecard bonus",
}

const DEDUCTION_LABELS: Record<string, string> = {
  escrow: "Escrow",
  insurance: "Insurance",
  flat_recurring: "Flat recurring",
  percent_of_gross: "% of gross",
}

/** Human summary of a stored rule, for the read-only list. */
function describeRule(rule: Record<string, unknown>): string {
  const label = RULE_LABELS[String(rule.type)] ?? String(rule.type)
  if (rule.type === "per_mile") {
    return `${label} — ${Number(rule.rateCentsPerMile)}¢${rule.loadedOnly ? " (loaded only)" : " (all miles)"}`
  }
  if (typeof rule.basisPoints === "number") return `${label} — ${(rule.basisPoints / 100).toFixed(2)}%`
  if (typeof rule.amountCents === "number") {
    const after = typeof rule.afterStops === "number" && rule.afterStops > 0 ? ` after ${rule.afterStops}` : ""
    return `${label} — $${(rule.amountCents / 100).toFixed(2)}${after}`
  }
  return label
}

function describeDeduction(d: Record<string, unknown>): string {
  const label = String(d.label ?? DEDUCTION_LABELS[String(d.kind)] ?? d.kind)
  if (typeof d.basisPoints === "number") return `${label} — ${(d.basisPoints / 100).toFixed(2)}%`
  return `${label} — $${(Number(d.amountCents) / 100).toFixed(2)}/week`
}

const emptyDeduction = (): DeductionDraft => ({ kind: "escrow", dollars: "", percent: "", label: "" })

export function PayRulesPanel({ drivers, canWrite }: { drivers: PayRulesDriver[]; canWrite: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [rules, setRules] = useState<RuleDraft[]>([])
  const [deductions, setDeductions] = useState<DeductionDraft[]>([])

  const openEditor = (driver: PayRulesDriver) => {
    setEditing(driver.driverId)
    setName(driver.isAuto || !driver.ruleSet ? "" : driver.ruleSet.name)
    // Start from the driver's current program so "edit" never silently drops
    // the rules they already settle under.
    const seeded: RuleDraft[] = []
    for (const raw of driver.ruleSet?.rules ?? []) {
      const r = raw as Record<string, unknown>
      if (r.type === "per_mile") {
        seeded.push({ type: "per_mile", cents: String(r.rateCentsPerMile ?? ""), loadedOnly: Boolean(r.loadedOnly) })
      } else if (
        r.type === "percent_linehaul" || r.type === "percent_total" ||
        r.type === "percent_accessorials" || r.type === "fsc_passthrough"
      ) {
        seeded.push({ type: r.type, percent: String(Number(r.basisPoints ?? 0) / 100) })
      } else if (r.type === "flat_per_load") {
        seeded.push({ type: "flat_per_load", dollars: String(Number(r.amountCents ?? 0) / 100) })
      } else if (r.type === "per_stop") {
        seeded.push({
          type: "per_stop", dollars: String(Number(r.amountCents ?? 0) / 100),
          afterStops: String(r.afterStops ?? ""),
        })
      } else if (r.type === "referral_bonus") {
        seeded.push({ type: "referral_bonus" })
      }
    }
    setRules(seeded.length > 0 ? seeded : [{ type: "per_mile", cents: "", loadedOnly: true }])
    setDeductions(
      (driver.ruleSet?.deductions ?? []).map((raw) => {
        const d = raw as Record<string, unknown>
        return {
          kind: (d.kind as DeductionDraft["kind"]) ?? "escrow",
          dollars: typeof d.amountCents === "number" ? String(d.amountCents / 100) : "",
          percent: typeof d.basisPoints === "number" ? String(d.basisPoints / 100) : "",
          label: String(d.label ?? ""),
        }
      })
    )
  }

  const toCents = (dollars: string) => dollarsToCents(dollars)
  // Percent → basis points is the same ×100 decimal quantization as dollars → cents.
  const toBps = (percent: string) => dollarsToCents(percent)

  const save = (driverId: string) => {
    const payloadRules = rules.map((r) => {
      if (r.type === "per_mile") {
        return { type: "per_mile", rateCentsPerMile: Math.round(Number(r.cents)), loadedOnly: r.loadedOnly }
      }
      if (r.type === "flat_per_load") return { type: "flat_per_load", amountCents: toCents(r.dollars) }
      if (r.type === "per_stop") {
        return {
          type: "per_stop", amountCents: toCents(r.dollars),
          ...(r.afterStops ? { afterStops: Math.round(Number(r.afterStops)) } : {}),
        }
      }
      if (r.type === "referral_bonus") return { type: "referral_bonus" }
      return { type: r.type, basisPoints: toBps(r.percent) }
    })
    const payloadDeductions = deductions.map((d) =>
      d.kind === "percent_of_gross"
        ? { kind: d.kind, basisPoints: toBps(d.percent), label: d.label }
        : { kind: d.kind, amountCents: toCents(d.dollars), label: d.label }
    )
    startTransition(async () => {
      const result = await savePayRulesAction(driverId, {
        name, rules: payloadRules, deductions: payloadDeductions,
      })
      if (result.ok) {
        toast.success(
          result.rejected
            ? `Pay program saved — ${result.rejected} incomplete rule(s) dropped`
            : "Pay program saved"
        )
        setEditing(null)
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed")
      }
    })
  }

  const reset = (driverId: string) =>
    startTransition(async () => {
      const result = await resetPayRulesAction(driverId)
      if (result.ok) {
        toast.success("Back to the driver form's pay settings")
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })

  return (
    <div className="space-y-3">
      {drivers.length === 0 ? (
        <Panel className="p-5">
          <p className="text-body-sm text-fg-3">No active drivers yet.</p>
        </Panel>
      ) : null}

      {drivers.map((driver) => (
        <Panel key={driver.driverId} className="p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
                <Wallet className="h-4 w-4 text-accent-text" />
                {driver.driverName}
                {driver.isAuto ? (
                  <Pill tone="neutral">From driver form</Pill>
                ) : driver.ruleSet ? (
                  <Pill tone="accent">Custom program</Pill>
                ) : (
                  <Pill tone="warn">No pay program</Pill>
                )}
              </h3>
              {driver.ruleSet ? (
                <ul className="mt-2 space-y-0.5 text-body-xs text-fg-3">
                  {driver.ruleSet.rules.map((rule, i) => (
                    <li key={i}>• {describeRule(rule as Record<string, unknown>)}</li>
                  ))}
                  {driver.ruleSet.deductions.map((d, i) => (
                    <li key={`d${i}`} className="text-bad">
                      − {describeDeduction(d as Record<string, unknown>)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-body-xs text-fg-3">
                  Nothing will be computed for this driver at settlement time.
                </p>
              )}
            </div>
            {canWrite ? (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className={btnSecondaryCls}
                  onClick={() => (editing === driver.driverId ? setEditing(null) : openEditor(driver))}
                  disabled={pending}
                >
                  {editing === driver.driverId ? "Cancel" : driver.isAuto || !driver.ruleSet ? "Build a program" : "Edit"}
                </button>
                {!driver.isAuto && driver.ruleSet ? (
                  <button
                    type="button"
                    className={btnSecondaryCls}
                    onClick={() => reset(driver.driverId)}
                    disabled={pending}
                    aria-label={`Reset ${driver.driverName} to the driver form's pay settings`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {editing === driver.driverId ? (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div>
                <label className={labelCls} htmlFor={`name-${driver.driverId}`}>Program name</label>
                <input
                  id={`name-${driver.driverId}`}
                  className={fieldCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Regional per-mile + stop pay"
                />
              </div>

              <div className="space-y-2">
                <p className={labelCls}>Earnings</p>
                {rules.map((rule, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Rule type"
                      className={`${fieldCls} max-w-[190px]`}
                      value={rule.type}
                      onChange={(e) => {
                        const type = e.target.value as RuleDraft["type"]
                        const next = [...rules]
                        next[i] =
                          type === "per_mile" ? { type, cents: "", loadedOnly: true }
                          : type === "flat_per_load" ? { type, dollars: "" }
                          : type === "per_stop" ? { type, dollars: "", afterStops: "" }
                          : type === "referral_bonus" ? { type }
                          : { type, percent: "" }
                        setRules(next)
                      }}
                    >
                      {Object.entries(RULE_LABELS)
                        .filter(([k]) => k !== "scorecard_bonus")
                        .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>

                    {rule.type === "per_mile" ? (
                      <>
                        <input
                          className={`${fieldCls} max-w-[110px]`} inputMode="decimal" placeholder="cents"
                          aria-label="Cents per mile" value={rule.cents}
                          onChange={(e) => {
                            const next = [...rules]; next[i] = { ...rule, cents: e.target.value }; setRules(next)
                          }}
                        />
                        <label className="flex items-center gap-1.5 text-body-xs text-fg-3">
                          <input
                            type="checkbox" checked={rule.loadedOnly}
                            onChange={(e) => {
                              const next = [...rules]; next[i] = { ...rule, loadedOnly: e.target.checked }; setRules(next)
                            }}
                          />
                          Loaded miles only
                        </label>
                      </>
                    ) : rule.type === "flat_per_load" ? (
                      <input
                        className={`${fieldCls} max-w-[110px]`} inputMode="decimal" placeholder="$"
                        aria-label="Dollars per load" value={rule.dollars}
                        onChange={(e) => {
                          const next = [...rules]; next[i] = { ...rule, dollars: e.target.value }; setRules(next)
                        }}
                      />
                    ) : rule.type === "per_stop" ? (
                      <>
                        <input
                          className={`${fieldCls} max-w-[110px]`} inputMode="decimal" placeholder="$"
                          aria-label="Dollars per stop" value={rule.dollars}
                          onChange={(e) => {
                            const next = [...rules]; next[i] = { ...rule, dollars: e.target.value }; setRules(next)
                          }}
                        />
                        <input
                          className={`${fieldCls} max-w-[120px]`} inputMode="numeric" placeholder="after N stops"
                          aria-label="Free stops before pay starts" value={rule.afterStops}
                          onChange={(e) => {
                            const next = [...rules]; next[i] = { ...rule, afterStops: e.target.value }; setRules(next)
                          }}
                        />
                      </>
                    ) : rule.type === "referral_bonus" ? (
                      <span className="text-body-xs text-fg-3">Pays approved referrals in this period</span>
                    ) : (
                      <input
                        className={`${fieldCls} max-w-[110px]`} inputMode="decimal" placeholder="%"
                        aria-label="Percent" value={rule.percent}
                        onChange={(e) => {
                          const next = [...rules]; next[i] = { ...rule, percent: e.target.value }; setRules(next)
                        }}
                      />
                    )}

                    <button
                      type="button" aria-label="Remove rule"
                      className="rounded-lg p-2 text-fg-3 hover:bg-hover"
                      onClick={() => setRules(rules.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button" className={btnSecondaryCls}
                  onClick={() => setRules([...rules, { type: "per_mile", cents: "", loadedOnly: true }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add earning rule
                </button>
              </div>

              <div className="space-y-2">
                <p className={labelCls}>Weekly deductions</p>
                {deductions.map((d, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Deduction kind" className={`${fieldCls} max-w-[170px]`} value={d.kind}
                      onChange={(e) => {
                        const next = [...deductions]
                        next[i] = { ...d, kind: e.target.value as DeductionDraft["kind"] }
                        setDeductions(next)
                      }}
                    >
                      {Object.entries(DEDUCTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input
                      className={`${fieldCls} max-w-[110px]`} inputMode="decimal"
                      placeholder={d.kind === "percent_of_gross" ? "%" : "$"}
                      aria-label={d.kind === "percent_of_gross" ? "Percent of gross" : "Dollars per week"}
                      value={d.kind === "percent_of_gross" ? d.percent : d.dollars}
                      onChange={(e) => {
                        const next = [...deductions]
                        next[i] = d.kind === "percent_of_gross"
                          ? { ...d, percent: e.target.value }
                          : { ...d, dollars: e.target.value }
                        setDeductions(next)
                      }}
                    />
                    <input
                      className={`${fieldCls} max-w-[190px]`} placeholder="Label (shown on the statement)"
                      aria-label="Deduction label" value={d.label}
                      onChange={(e) => {
                        const next = [...deductions]; next[i] = { ...d, label: e.target.value }; setDeductions(next)
                      }}
                    />
                    <button
                      type="button" aria-label="Remove deduction"
                      className="rounded-lg p-2 text-fg-3 hover:bg-hover"
                      onClick={() => setDeductions(deductions.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button" className={btnSecondaryCls}
                  onClick={() => setDeductions([...deductions, emptyDeduction()])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add deduction
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button" className={btnPrimaryCls} disabled={pending}
                  onClick={() => save(driver.driverId)}
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save pay program
                </button>
                <p className="text-body-xs text-fg-3">
                  Applies to the next settlement drafted for {driver.driverName}.
                </p>
              </div>
            </div>
          ) : null}
        </Panel>
      ))}
    </div>
  )
}
