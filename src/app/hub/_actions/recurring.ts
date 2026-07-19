"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { getLoad, addLoadEvent } from "@/lib/hub/loads"
import {
  getRecurringRules, saveRecurringRules, WEEKDAY_LABELS, type RecurringLaneRule,
} from "@/lib/hub/recurring"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"
import type { ActionResult } from "./fleet"

/**
 * Schedule (or turn off) the weekly rebook for a load. weekday 0–6 (Sunday=0)
 * upserts an enabled rule; null removes it. The daily recurring-rebook cron
 * books the copy each matching morning via the same copy/strip matrix as the
 * Duplicate button.
 */
export async function setRecurringLaneAction(
  loadId: string,
  weekday: number | null
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  if (weekday !== null && (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
    return { ok: false, error: "Pick a weekday" }
  }
  try {
    const load = await getLoad(user.carrierId, loadId)
    if (!load) return { ok: false, error: "Load not found" }

    const rules = await getRecurringRules(user.carrierId)
    const existing = rules.find((r) => r.loadId === loadId) ?? null
    const others = rules.filter((r) => r.loadId !== loadId)

    if (weekday === null) {
      if (!existing) return { ok: true, id: loadId }
      await saveRecurringRules(user.carrierId, others)
      await addLoadEvent(user.carrierId, loadId, "note", {
        note: "Weekly rebook turned off",
      }, { id: user.id, name: user.name })
      await logAudit({
        carrierId: user.carrierId, actorId: user.id, actorName: user.name,
        entityType: "load", entityId: loadId, action: "update",
        oldValue: { recurring_weekday: existing.weekday, enabled: existing.enabled },
        newValue: { recurring_weekday: null },
      })
    } else {
      const rule: RecurringLaneRule = {
        loadId,
        reference: load.reference,
        weekday,
        enabled: true,
        // Re-enabling or moving the day starts a fresh schedule; keep the last
        // booked ref for display but let the rule run again on its next match.
        lastRunDate: null,
        lastLoadRef: existing?.lastLoadRef ?? null,
        lastError: null,
      }
      await saveRecurringRules(user.carrierId, [...others, rule])
      await addLoadEvent(user.carrierId, loadId, "note", {
        note: `Weekly rebook scheduled: every ${WEEKDAY_LABELS[weekday]}`,
      }, { id: user.id, name: user.name })
      await logAudit({
        carrierId: user.carrierId, actorId: user.id, actorName: user.name,
        entityType: "load", entityId: loadId, action: "update",
        oldValue: existing ? { recurring_weekday: existing.weekday, enabled: existing.enabled } : { recurring_weekday: null },
        newValue: { recurring_weekday: weekday, enabled: true },
      })
    }
    revalidatePath(`/hub/loads/${loadId}`)
    return { ok: true, id: loadId }
  } catch (err) {
    return actionError(err, "Failed to update the weekly rebook")
  }
}
