"use server"

/**
 * Pay-rules settings actions (P3.1).
 *
 * hub.pay_rules has been fully modelled since migration 005 and pay-rules-db.ts
 * has read and written it all along — there was simply no screen, so the most
 * consequential number in the product (what a driver is paid) could only be
 * expressed through the two simple fields on the driver form.
 *
 * Gated on drivers:write, the same authority saveDriverAction already needs to
 * change a driver's pay rate. Anything stricter would be incoherent: you could
 * set the rate on the driver form but not here.
 */
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { queryOne } from "@/lib/hub/db"
import { savePayRuleSet, resetPayRulesToAuto } from "@/lib/hub/pay-rules-db"
import type { PayRule, PayDeduction, PayRuleSet } from "@/lib/hub/pay-rules"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
}

const centsField = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : null
}
const bpsField = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 20000 ? n : null
}

/**
 * Rebuild the rule list from client input instead of trusting it.
 *
 * These rows drive what a person is paid, and the payload arrives from a
 * browser. Every numeric field is re-parsed to an integer (cents or basis
 * points, never a float), and anything unrecognised is dropped rather than
 * stored — parseRuleSet would drop it on read anyway, and a rule that silently
 * vanishes between saving and settling is worse than one refused up front.
 */
function sanitizeRules(input: unknown): { rules: PayRule[]; rejected: number } {
  if (!Array.isArray(input)) return { rules: [], rejected: 0 }
  const rules: PayRule[] = []
  let rejected = 0
  for (const raw of input) {
    const r = raw as Record<string, unknown>
    switch (r?.type) {
      case "per_mile": {
        const rate = centsField(r.rateCentsPerMile)
        if (rate == null) { rejected++; break }
        rules.push({ type: "per_mile", rateCentsPerMile: rate, loadedOnly: Boolean(r.loadedOnly) })
        break
      }
      case "percent_linehaul":
      case "percent_total":
      case "percent_accessorials":
      case "fsc_passthrough": {
        const bps = bpsField(r.basisPoints)
        if (bps == null) { rejected++; break }
        rules.push({ type: r.type, basisPoints: bps } as PayRule)
        break
      }
      case "flat_per_load": {
        const amount = centsField(r.amountCents)
        if (amount == null) { rejected++; break }
        rules.push({ type: "flat_per_load", amountCents: amount })
        break
      }
      case "per_stop": {
        const amount = centsField(r.amountCents)
        if (amount == null) { rejected++; break }
        const after = centsField(r.afterStops)
        rules.push({ type: "per_stop", amountCents: amount, ...(after != null ? { afterStops: after } : {}) })
        break
      }
      case "referral_bonus":
        rules.push({ type: "referral_bonus" })
        break
      case "scorecard_bonus": {
        // Tiers are owner-decided (OD-6) and not editable here yet; preserve
        // any that already exist rather than dropping them on an unrelated save.
        const tiers = Array.isArray(r.tiers)
          ? r.tiers
              .map((t) => {
                const rec = t as Record<string, unknown>
                const minScore = Number(rec?.minScore)
                const amountCents = centsField(rec?.amountCents)
                return Number.isFinite(minScore) && amountCents != null
                  ? { minScore, amountCents }
                  : null
              })
              .filter((t): t is { minScore: number; amountCents: number } => t !== null)
          : []
        rules.push({ type: "scorecard_bonus", tiers })
        break
      }
      default:
        rejected++
    }
  }
  return { rules, rejected }
}

function sanitizeDeductions(input: unknown): PayDeduction[] {
  if (!Array.isArray(input)) return []
  const out: PayDeduction[] = []
  for (const raw of input) {
    const d = raw as Record<string, unknown>
    const label = typeof d?.label === "string" ? d.label.trim() : ""
    if (d?.kind === "escrow" || d?.kind === "insurance") {
      const amount = centsField(d.amountCents)
      if (amount != null && amount > 0) {
        out.push({ kind: d.kind, amountCents: amount, ...(label ? { label } : {}) })
      }
    } else if (d?.kind === "flat_recurring") {
      const amount = centsField(d.amountCents)
      if (amount != null && amount > 0 && label) {
        out.push({ kind: "flat_recurring", amountCents: amount, label })
      }
    } else if (d?.kind === "percent_of_gross") {
      const bps = bpsField(d.basisPoints)
      if (bps != null && bps > 0 && label) {
        out.push({ kind: "percent_of_gross", basisPoints: bps, label })
      }
    }
  }
  return out
}

export async function savePayRulesAction(
  driverId: string,
  input: { name: string; rules: unknown; deductions: unknown }
): Promise<Result & { rejected?: number }> {
  try {
    const user = await requirePermission("drivers:write")
    const name = input.name?.trim()
    if (!name) return { ok: false, error: "Give the pay program a name" }

    // Tenancy: the driver id comes from the browser.
    const driver = await queryOne<{ id: string; name: string }>(
      `SELECT id, first_name || ' ' || last_name AS name FROM hub.drivers
       WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [user.carrierId, driverId]
    )
    if (!driver) return { ok: false, error: "Driver not found" }

    const { rules, rejected } = sanitizeRules(input.rules)
    if (rules.length === 0) {
      return { ok: false, error: "A pay program needs at least one earning rule" }
    }
    const ruleSet: PayRuleSet = { name, rules, deductions: sanitizeDeductions(input.deductions) }
    const saved = await savePayRuleSet(user.carrierId, driverId, ruleSet)

    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "pay_rule", entityId: saved.id, action: "save",
      newValue: { driver: driver.name, name, rules: ruleSet.rules, deductions: ruleSet.deductions },
    })
    revalidatePath("/hub/settings/pay-rules")
    revalidatePath("/hub/money/settlements")
    return { ok: true, ...(rejected ? { rejected } : {}) }
  } catch (err) {
    return actionError(err, "Could not save the pay program")
  }
}

export async function resetPayRulesAction(driverId: string): Promise<Result> {
  try {
    const user = await requirePermission("drivers:write")
    const driver = await queryOne<{
      id: string; name: string; pay_type: "per_mile" | "percentage"; pay_rate: string
      pay_loaded_miles_only: boolean; escrow_weekly_cents: number; insurance_weekly_cents: number
    }>(
      `SELECT id, first_name || ' ' || last_name AS name, pay_type, pay_rate,
         pay_loaded_miles_only, escrow_weekly_cents, insurance_weekly_cents
       FROM hub.drivers WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [user.carrierId, driverId]
    )
    if (!driver) return { ok: false, error: "Driver not found" }

    await resetPayRulesToAuto(user.carrierId, driverId, {
      payType: driver.pay_type,
      payRate: Number(driver.pay_rate),
      payLoadedMilesOnly: driver.pay_loaded_miles_only,
      escrowWeeklyCents: Number(driver.escrow_weekly_cents),
      insuranceWeeklyCents: Number(driver.insurance_weekly_cents),
    })
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "pay_rule", entityId: driverId, action: "reset_to_auto",
      newValue: { driver: driver.name },
    })
    revalidatePath("/hub/settings/pay-rules")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not reset the pay program")
  }
}

/**
 * Show or hide per-run pay in the driver app (I15).
 *
 * Lives beside the pay programs because it answers the same question from the
 * other end: the rules above decide what a driver earns, this decides whether
 * the driver can see it before Friday. Default ON — a driver who cannot see
 * what the work is worth until payroll is being asked to take it on trust —
 * but some carriers genuinely keep per-load pay in the office until the
 * settlement is cut, so it is a switch rather than an assumption.
 *
 * Same drivers:write gate as the rules themselves. It never affects the
 * linehaul, which the driver app does not send to the phone either way.
 */
export async function setDriverRunPayAction(show: boolean): Promise<Result> {
  try {
    const user = await requirePermission("drivers:write")
    const { query } = await import("@/lib/hub/db")
    // Seed the '{driverApp}' parent first — jsonb_set returns the target
    // unchanged when a parent key is missing. Same shape as setBrandAccentAction.
    await query(
      `INSERT INTO hub.carrier_settings (carrier_id, settings)
       VALUES ($1, jsonb_build_object('driverApp', jsonb_build_object('showRunPay', $2::boolean)))
       ON CONFLICT (carrier_id) DO UPDATE SET
         settings = jsonb_set(
           jsonb_set(hub.carrier_settings.settings, '{driverApp}',
             COALESCE(hub.carrier_settings.settings->'driverApp', '{}'::jsonb), TRUE),
           '{driverApp,showRunPay}', to_jsonb($2::boolean), TRUE),
         updated_at = NOW()`,
      [user.carrierId, show]
    )
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "carrier_settings", entityId: user.carrierId, action: "set_driver_run_pay",
      newValue: { showRunPay: show },
    })
    revalidatePath("/hub/settings/pay-rules")
    revalidatePath("/hub/driver")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not save")
  }
}
