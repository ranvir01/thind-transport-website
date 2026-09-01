"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { setWebsiteLeadStatus } from "@/lib/hub/website-leads"
import { promoteWebsiteLead } from "@/lib/hub/recruiting"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"

/**
 * Lead status flips are recruiting work — gated like promoteLeadAction
 * (drivers:write), and setWebsiteLeadStatus itself refuses any carrier but
 * the site operator's (the leads table is operator-owned and carrier-less).
 */
export async function setLeadStatusAction(
  id: string,
  status: "new" | "contacted" | "closed"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requirePermission("drivers:write")
    await setWebsiteLeadStatus(user.carrierId, id, status)
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "website_lead", entityId: id, action: `lead_${status}`,
    })
    revalidatePath("/hub/leads")
    revalidatePath("/hub")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not update lead" }
  }
}

/**
 * One tap from "raised their hand on the website" to a real applicant in the
 * recruiting pipeline. Gated like every other applicant mutation
 * (drivers:write) — an accountant can see the leads list but can't hire off it.
 */
export async function promoteLeadAction(
  id: string
): Promise<{ ok: boolean; error?: string; applicantId?: string }> {
  try {
    const user = await requirePermission("drivers:write")
    const result = await promoteWebsiteLead(user.carrierId, id, user.name)
    if (!result.ok) return result
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "website_lead", entityId: id, action: "lead_promoted",
    })
    revalidatePath("/hub/leads")
    revalidatePath("/hub/recruiting")
    revalidatePath("/hub")
    return result
  } catch (err) {
    return actionError(err, "Could not promote the lead")
  }
}
