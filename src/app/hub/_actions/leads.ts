"use server"

import { revalidatePath } from "next/cache"
import { requireOfficeUser } from "@/lib/hub/session"
import { setWebsiteLeadStatus } from "@/lib/hub/website-leads"
import { logAudit } from "@/lib/hub/audit"

export async function setLeadStatusAction(
  id: string,
  status: "new" | "contacted" | "closed"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireOfficeUser()
    await setWebsiteLeadStatus(id, status)
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
