"use server"

import { revalidatePath } from "next/cache"
import { getHubUser } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
}

/** Platform admin only: suspend/reactivate a tenant (crons skip suspended). */
export async function setTenantStatusAction(
  tenantId: string,
  status: "active" | "suspended"
): Promise<Result> {
  const user = await getHubUser()
  if (!user || user.role !== "platform_admin") return { ok: false, error: "Platform admins only" }
  try {
    await query(`UPDATE hub.carriers SET status = $2, updated_at = NOW() WHERE id = $1`, [
      tenantId, status,
    ])
    await logAudit({
      carrierId: tenantId, actorId: user.id, actorName: user.name,
      entityType: "carrier", entityId: tenantId, action: `tenant_${status}`,
    })
    revalidatePath("/hub/admin")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Failed")
  }
}
