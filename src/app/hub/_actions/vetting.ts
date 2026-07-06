"use server"

import { revalidatePath } from "next/cache"
import { requireOfficeUser, requirePermission } from "@/lib/hub/session"
import { avgDaysToPay, creditExposure, latestVetting, vetCustomer, fmcsaConfigured } from "@/lib/hub/vetting"
import { logAudit } from "@/lib/hub/audit"

interface Result {
  ok: boolean
  error?: string
}

export async function vetCustomerAction(customerId: string): Promise<Result> {
  try {
    const user = await requirePermission("customers:write")
    if (!fmcsaConfigured()) {
      return {
        ok: false,
        error: "Add FMCSA_WEBKEY (free, five minutes at mobile.fmcsa.dot.gov) to verify authority live",
      }
    }
    const snapshot = await vetCustomer(user.carrierId, customerId)
    if (!snapshot) return { ok: false, error: "Customer not found" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "customer", entityId: customerId, action: "fmcsa_vetting",
      newValue: { allowed: snapshot.allowed_to_operate, score: snapshot.risk_score },
    })
    revalidatePath(`/hub/customers/${customerId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Vetting failed" }
  }
}

/** Booking-time intel for the load form: credit + payment speed + authority. */
export async function customerBookingIntel(customerId: string): Promise<{
  warnings: string[]
}> {
  try {
    const user = await requireOfficeUser()
    const [speed, credit, vetting] = await Promise.all([
      avgDaysToPay(user.carrierId, customerId),
      creditExposure(user.carrierId, customerId),
      latestVetting(user.carrierId, customerId),
    ])
    const warnings: string[] = []
    if (vetting?.allowed_to_operate === false) {
      warnings.push("FMCSA shows this broker NOT allowed to operate — do not book")
    } else if (vetting && (vetting.risk_score ?? 100) < 40) {
      warnings.push(`Vetting risk score ${vetting.risk_score}/100 — read the customer page before booking`)
    }
    if (credit.overLimit) {
      warnings.push(
        `Over their credit limit: $${(credit.openCents / 100).toFixed(0)} open vs $${((credit.creditLimitCents ?? 0) / 100).toFixed(0)} limit`
      )
    }
    if (speed.slowPayer) {
      warnings.push(`Slow payer — averages ${speed.avgDays} days to pay`)
    }
    return { warnings }
  } catch {
    return { warnings: [] }
  }
}
