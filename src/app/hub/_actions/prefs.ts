"use server"

import { requireOfficeUser } from "@/lib/hub/session"
import { setUserPref } from "@/lib/hub/user-prefs"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
}

/**
 * A user's own UI preferences. No permission beyond "is an office user":
 * the row is keyed to the caller's own id and carrier, so there is nothing
 * here that touches anyone else. Not audited — sidebar width is not a
 * business event.
 */
export async function setSidebarCollapsedAction(collapsed: boolean): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    const ok = await setUserPref(user.carrierId, user.id, "sidebarCollapsed", Boolean(collapsed))
    return ok ? { ok: true } : { ok: false, error: "Could not save that preference" }
  } catch (err) {
    return actionError(err, "Could not save that preference")
  }
}
