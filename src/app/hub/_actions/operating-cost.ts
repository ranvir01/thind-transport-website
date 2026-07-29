"use server"

/**
 * The all-in cost-per-mile assumption behind every margin figure in the
 * product. It had no screen at all — the only way to change it was to edit
 * carrier_settings by hand.
 *
 * settings:manage, matching the other whole-company money settings: this one
 * number silently re-ranks every lane and re-prices every load's margin on the
 * dispatch board, so it is an owner decision rather than a dispatch one.
 */
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { getCarrierSettings } from "@/lib/hub/settings"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
}

/** A cost per mile outside this band is a typo, not a business decision. */
const MIN_CPM_CENTS = 50
const MAX_CPM_CENTS = 1000

export async function saveCostPerMileAction(input: { cents: unknown }): Promise<Result> {
  try {
    const user = await requirePermission("settings:manage")
    const cents = Number(input.cents)
    if (!Number.isFinite(cents) || !Number.isInteger(cents)) {
      return { ok: false, error: "Enter a whole number of cents per mile" }
    }
    if (cents < MIN_CPM_CENTS || cents > MAX_CPM_CENTS) {
      return {
        ok: false,
        error: `That reads like a typo — enter between ${MIN_CPM_CENTS}¢ and $${(MAX_CPM_CENTS / 100).toFixed(2)} per mile`,
      }
    }
    const before = await getCarrierSettings(user.carrierId)
    await query(
      `UPDATE hub.carrier_settings
       SET settings = jsonb_set(settings, '{costPerMileCents}', to_jsonb($2::int), TRUE), updated_at = NOW()
       WHERE carrier_id = $1`,
      [user.carrierId, cents]
    )
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "carrier_settings", entityId: user.carrierId, action: "cost_per_mile_changed",
      oldValue: { costPerMileCents: before.costPerMileCents },
      newValue: { costPerMileCents: cents },
    })
    // Every surface that prices margin off this constant.
    revalidatePath("/hub/settings/operating-cost")
    revalidatePath("/hub/dispatch")
    revalidatePath("/hub/reports")
    revalidatePath("/hub/reports/owner")
    revalidatePath("/hub/planner")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not save the cost per mile")
  }
}
