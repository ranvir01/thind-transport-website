"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { addComplianceItem, resolveComplianceItem } from "@/lib/hub/compliance"
import { computeIftaQuarter, importIftaRates, setIftaStatus } from "@/lib/hub/ifta"
import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { assertCarrierRefs } from "@/lib/hub/tenancy"
import { dollarsToCents } from "@/lib/hub/types"
import type { ActionResult } from "./fleet"

function asError(err: unknown, fallback: string): ActionResult {
  return { ok: false, error: err instanceof Error ? err.message : fallback }
}

export async function addComplianceItemAction(values: {
  kind: string
  dueOn?: string
  note?: string
}): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("compliance:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  if (!values.kind.trim()) return { ok: false, error: "What is the item?" }
  try {
    await addComplianceItem(user.carrierId, {
      kind: values.kind.trim(), dueOn: values.dueOn || null, note: values.note || null,
    })
    revalidatePath("/hub/compliance")
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to add item")
  }
}

export async function resolveComplianceItemAction(id: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("compliance:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    await resolveComplianceItem(user.carrierId, id)
    revalidatePath("/hub/compliance")
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to resolve item")
  }
}

export async function computeIftaAction(quarter: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("compliance:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  if (!/^\d{4}Q[1-4]$/.test(quarter)) return { ok: false, error: "Bad quarter (use 2026Q2)" }
  try {
    const { result } = await computeIftaQuarter(user.carrierId, quarter, user)
    revalidatePath("/hub/compliance/ifta")
    return {
      ok: true,
      error: result.missingRates.length
        ? `Missing tax rates for: ${result.missingRates.join(", ")} — import rates and recompute`
        : undefined,
    }
  } catch (err) {
    return asError(err, "Failed to compute IFTA")
  }
}

export async function setIftaStatusAction(
  quarter: string,
  status: "draft" | "reviewed" | "filed"
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("compliance:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    await setIftaStatus(user.carrierId, quarter, status, user)
    revalidatePath("/hub/compliance/ifta")
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to update report status")
  }
}

/** Rates pasted as lines of "JUR,rate[,surcharge]" (iftach.org matrix transcription). */
export async function importIftaRatesAction(quarter: string, ratesText: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("compliance:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  if (!/^\d{4}Q[1-4]$/.test(quarter)) return { ok: false, error: "Bad quarter" }
  const rows: { jurisdiction: string; rate: number; surchargeRate: number }[] = []
  for (const line of ratesText.split("\n")) {
    const parts = line.split(/[,\t]/).map((p) => p.trim())
    if (parts.length < 2 || !/^[A-Za-z]{2}$/.test(parts[0])) continue
    const rate = Number(parts[1])
    const surcharge = parts[2] ? Number(parts[2]) : 0
    if (!Number.isFinite(rate)) continue
    rows.push({ jurisdiction: parts[0], rate, surchargeRate: Number.isFinite(surcharge) ? surcharge : 0 })
  }
  if (rows.length === 0) return { ok: false, error: "No rates parsed — use lines like WA,0.4940 or IN,0.5500,0.1100" }
  try {
    const count = await importIftaRates(user.carrierId, rows, quarter, user)
    revalidatePath("/hub/compliance/ifta")
    return { ok: true, id: String(count) }
  } catch (err) {
    return asError(err, "Failed to import rates")
  }
}

// ---- Maintenance (minimal Phase 3 surface, lives on the truck page) ----

export async function addMaintenanceScheduleAction(values: {
  truckId: string
  name: string
  intervalMiles?: string
  intervalDays?: string
  lastDoneOn?: string
}): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("fleet:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  if (!values.name.trim()) return { ok: false, error: "Name the PM item" }
  try {
    await assertCarrierRefs(user.carrierId, { truck_id: values.truckId })
    await query(
      `INSERT INTO hub.maintenance_schedules (carrier_id, truck_id, name, interval_miles, interval_days, last_done_on)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        user.carrierId, values.truckId, values.name.trim(),
        values.intervalMiles ? Number(values.intervalMiles) : null,
        values.intervalDays ? Number(values.intervalDays) : null,
        values.lastDoneOn || null,
      ]
    )
    revalidatePath(`/hub/fleet/trucks/${values.truckId}`)
    revalidatePath("/hub/compliance")
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to add schedule")
  }
}

export async function addMaintenanceRecordAction(values: {
  truckId: string
  doneOn: string
  vendor?: string
  cost: string
  odometer?: string
  notes?: string
  scheduleId?: string
}): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("fleet:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    await assertCarrierRefs(user.carrierId, {
      truck_id: values.truckId,
      schedule_id: values.scheduleId || null,
    })
    const costCents = dollarsToCents(values.cost)
    const rows = await query<{ id: string }>(
      `INSERT INTO hub.maintenance_records (carrier_id, truck_id, schedule_id, done_on, odometer, vendor, cost_cents, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        user.carrierId, values.truckId, values.scheduleId || null,
        values.doneOn || new Date().toISOString().slice(0, 10),
        values.odometer ? Number(values.odometer) : null,
        values.vendor || null, costCents, values.notes || null,
      ]
    )
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "maintenance_record", entityId: rows[0].id, action: "create",
      newValue: { truckId: values.truckId, costCents, vendor: values.vendor || null },
    })
    if (values.scheduleId) {
      await query(
        `UPDATE hub.maintenance_schedules SET last_done_on = $2, last_done_odometer = $3, updated_at = NOW()
         WHERE id = $1 AND carrier_id = $4`,
        [values.scheduleId, values.doneOn, values.odometer ? Number(values.odometer) : null, user.carrierId]
      )
    }
    revalidatePath(`/hub/fleet/trucks/${values.truckId}`)
    revalidatePath("/hub/compliance")
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to add record")
  }
}
