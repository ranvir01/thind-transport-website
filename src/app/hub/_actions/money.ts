"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import {
  createInvoiceFromLoad, recordPayment, sendFactoringPacket, setInvoiceStatus,
} from "@/lib/hub/invoices"
import {
  approveSettlement, createAdvance, draftSettlements, markSettlementPaid,
} from "@/lib/hub/settlements"
import { createExpense } from "@/lib/hub/expenses"
import { logAudit } from "@/lib/hub/audit"
import { query } from "@/lib/hub/db"
import { dollarsToCents, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/hub/types"
import type { ActionResult } from "./fleet"

function asError(err: unknown, fallback: string): ActionResult {
  return { ok: false, error: err instanceof Error ? err.message : fallback }
}

function revalidateMoney() {
  revalidatePath("/hub/money")
  revalidatePath("/hub/money/settlements")
  revalidatePath("/hub")
}

export async function createInvoiceAction(loadId: string): Promise<ActionResult & { emailed?: boolean }> {
  let user
  try {
    user = await requirePermission("money:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    const { invoice, emailed, error } = await createInvoiceFromLoad(user.carrierId, loadId, user)
    revalidateMoney()
    revalidatePath(`/hub/loads/${loadId}`)
    revalidatePath("/hub/dispatch")
    return { ok: true, id: invoice.id, emailed, error }
  } catch (err) {
    return asError(err, "Failed to create invoice")
  }
}

export async function recordPaymentAction(
  invoiceId: string,
  values: { amount: string; paidOn: string; method?: string; reference?: string }
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("money:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  const amountCents = dollarsToCents(values.amount)
  if (amountCents <= 0) return { ok: false, error: "Payment amount must be positive" }
  if (!values.paidOn) return { ok: false, error: "Payment date required" }
  try {
    await recordPayment(user.carrierId, invoiceId, {
      amountCents, paidOn: values.paidOn,
      method: values.method || null, reference: values.reference || null,
    }, user)
    revalidateMoney()
    revalidatePath(`/hub/money/invoices/${invoiceId}`)
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to record payment")
  }
}

export async function disputeInvoiceAction(invoiceId: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("money:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    await setInvoiceStatus(user.carrierId, invoiceId, "disputed", user)
    revalidateMoney()
    revalidatePath(`/hub/money/invoices/${invoiceId}`)
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to update invoice")
  }
}

export async function factoringPacketAction(invoiceId: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("money:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    const { to } = await sendFactoringPacket(user.carrierId, invoiceId, user)
    revalidatePath(`/hub/money/invoices/${invoiceId}`)
    return { ok: true, error: undefined, id: to }
  } catch (err) {
    return asError(err, "Failed to send factoring packet")
  }
}

export async function draftSettlementsAction(): Promise<ActionResult & { created?: number; skipped?: number }> {
  let user
  try {
    user = await requirePermission("money:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    // Weekly period: previous Monday → Sunday containing today
    const now = new Date()
    const day = now.getDay() || 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - day + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const result = await draftSettlements(
      user.carrierId,
      monday.toISOString().slice(0, 10),
      sunday.toISOString().slice(0, 10),
      user
    )
    revalidateMoney()
    return { ok: true, ...result }
  } catch (err) {
    return asError(err, "Failed to draft settlements")
  }
}

export async function approveSettlementAction(settlementId: string): Promise<ActionResult & { emailed?: boolean }> {
  let user
  try {
    user = await requirePermission("money:approve")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    const { emailed } = await approveSettlement(user.carrierId, settlementId, user)
    revalidateMoney()
    revalidatePath(`/hub/money/settlements/${settlementId}`)
    return { ok: true, emailed }
  } catch (err) {
    return asError(err, "Failed to approve settlement")
  }
}

export async function markSettlementPaidAction(settlementId: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("money:approve")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    const paid = await markSettlementPaid(user.carrierId, settlementId, user)
    if (!paid) return { ok: false, error: "Settlement not found or not approved" }
    revalidateMoney()
    revalidatePath(`/hub/money/settlements/${settlementId}`)
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to mark paid")
  }
}

export async function createAdvanceAction(values: {
  driverId: string
  amount: string
  issuedOn: string
  reference?: string
}): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("money:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  const amountCents = dollarsToCents(values.amount)
  if (amountCents <= 0) return { ok: false, error: "Advance amount must be positive" }
  if (!values.driverId) return { ok: false, error: "Pick a driver" }
  try {
    await createAdvance(user.carrierId, {
      driverId: values.driverId, amountCents,
      issuedOn: values.issuedOn || new Date().toISOString().slice(0, 10),
      reference: values.reference || null,
    }, user)
    revalidatePath("/hub/money/advances")
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to create advance")
  }
}

/** Decide a driver-requested advance: approve → deducts on the next settlement. */
export async function decideAdvanceAction(
  id: string,
  decision: "approve" | "deny"
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("money:approve")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  try {
    const { query } = await import("@/lib/hub/db")
    const rows = await query<{ id: string; driver_id: string; amount_cents: number }>(
      `UPDATE hub.advances SET status = $3, updated_at = NOW()
       WHERE carrier_id = $1 AND id = $2 AND status = 'pending'
       RETURNING id, driver_id, amount_cents`,
      [user.carrierId, id, decision === "approve" ? "outstanding" : "cancelled"]
    )
    if (rows.length === 0) return { ok: false, error: "Already decided" }
    const { logAudit } = await import("@/lib/hub/audit")
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "advance", entityId: id, action: decision,
      newValue: { amountCents: rows[0].amount_cents },
    })
    const { notifyDriver } = await import("@/lib/hub/notify")
    await notifyDriver(user.carrierId, rows[0].driver_id, {
      kind: "advance",
      title:
        decision === "approve"
          ? `Advance approved — $${(rows[0].amount_cents / 100).toFixed(2)} is on its way`
          : "Advance request denied — call the office",
      body: decision === "approve" ? "It deducts from your next settlement." : undefined,
      link: "/hub/driver/pay",
    })
    revalidatePath("/hub/money/advances")
    revalidatePath("/hub/driver/pay")
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to decide the advance")
  }
}

export async function createExpenseAction(values: {
  category: string
  amount: string
  incurredOn: string
  truckId?: string
  driverId?: string
  loadId?: string
  reimbursable: boolean
  billable: boolean
  memo?: string
}): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("money:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  if (!EXPENSE_CATEGORIES.includes(values.category as ExpenseCategory)) {
    return { ok: false, error: "Unknown category" }
  }
  const amountCents = dollarsToCents(values.amount)
  if (amountCents <= 0) return { ok: false, error: "Amount must be positive" }
  try {
    await createExpense(user.carrierId, {
      category: values.category as ExpenseCategory,
      amountCents,
      incurredOn: values.incurredOn || new Date().toISOString().slice(0, 10),
      truckId: values.truckId || null,
      driverId: values.driverId || null,
      loadId: values.loadId || null,
      reimbursable: values.reimbursable,
      billable: values.billable,
      memo: values.memo || null,
    }, user)
    revalidatePath("/hub/money/expenses")
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to record expense")
  }
}

// ---- Accessorial price book (owner: settings:manage; accountant can edit too via money:write) ----

export async function savePriceBookEntryAction(values: {
  id?: string
  name: string
  amount: string
  unit: string
}): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("money:write")
  } catch (err) {
    return asError(err, "Forbidden")
  }
  const amountCents = dollarsToCents(values.amount)
  if (!values.name.trim()) return { ok: false, error: "Name required" }
  if (!["flat", "per_hour", "per_day", "pass_through"].includes(values.unit)) {
    return { ok: false, error: "Bad unit" }
  }
  try {
    if (values.id) {
      await query(
        `UPDATE hub.accessorial_types SET name = $3, default_amount_cents = $4, unit = $5
         WHERE carrier_id = $1 AND id = $2`,
        [user.carrierId, values.id, values.name.trim(), amountCents, values.unit]
      )
    } else {
      await query(
        `INSERT INTO hub.accessorial_types (carrier_id, name, default_amount_cents, unit)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (carrier_id, name) DO UPDATE SET default_amount_cents = $3, unit = $4`,
        [user.carrierId, values.name.trim(), amountCents, values.unit]
      )
    }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "accessorial_type", entityId: values.id ?? values.name.trim(), action: "saved",
      newValue: { name: values.name.trim(), amountCents, unit: values.unit },
    })
    revalidatePath("/hub/settings/pricebook")
    return { ok: true }
  } catch (err) {
    return asError(err, "Failed to save price book entry")
  }
}
