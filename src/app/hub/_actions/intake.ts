"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"
import { query } from "@/lib/hub/db"
import { getIntakeDraft, resolveIntakeDraft } from "@/lib/hub/intake-drafts"

interface Result {
  ok: boolean
  error?: string
}

/**
 * Mark a draft accepted once the load it became actually exists.
 *
 * Called by the review screen AFTER createLoadAction succeeds, never before —
 * an accepted draft with no load would silently lose the freight, which is the
 * exact failure this whole feature exists to end.
 *
 * `loads:write` is the gate because accepting is booking. Dismissing uses the
 * same gate: deciding a rate con is not worth booking is a dispatch decision,
 * not a read.
 */
export async function acceptIntakeDraftAction(draftId: string, loadId: string): Promise<Result> {
  try {
    const user = await requirePermission("loads:write")
    const draft = await getIntakeDraft(user.carrierId, draftId)
    if (!draft) return { ok: false, error: "That draft is no longer in the Inbox" }

    const resolved = await resolveIntakeDraft({
      carrierId: user.carrierId, id: draftId, status: "accepted",
      createdLoadId: loadId, resolvedBy: user.id,
    })
    if (!resolved) return { ok: false, error: "Someone already handled that draft" }

    // Re-parent the emailed attachment from the carrier vault onto the load it
    // turned out to be for, so it shows up in the load's Documents tab and in
    // the factoring packet like any other rate con. Carrier-scoped, and scoped
    // to entity_type='carrier' so a re-run can never move a load's own docs.
    if (draft.document_id) {
      await query(
        `UPDATE hub.documents SET entity_type = 'load', entity_id = $3
          WHERE carrier_id = $1 AND id = $2 AND entity_type = 'carrier'`,
        [user.carrierId, draft.document_id, loadId]
      )
    }

    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "intake_draft", entityId: draftId, action: "accept",
      newValue: { load_id: loadId, source: draft.source, confidence: draft.confidence },
    })
    revalidatePath("/hub/inbox")
    revalidatePath(`/hub/loads/${loadId}`)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not file that draft")
  }
}

export async function dismissIntakeDraftAction(draftId: string): Promise<Result> {
  try {
    const user = await requirePermission("loads:write")
    const draft = await getIntakeDraft(user.carrierId, draftId)
    if (!draft) return { ok: false, error: "That draft is no longer in the Inbox" }

    const resolved = await resolveIntakeDraft({
      carrierId: user.carrierId, id: draftId, status: "dismissed", resolvedBy: user.id,
    })
    if (!resolved) return { ok: false, error: "Someone already handled that draft" }

    // The document stays in the carrier vault. Dismissing means "not a load I'm
    // booking", not "delete the broker's paperwork".
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "intake_draft", entityId: draftId, action: "dismiss",
      newValue: { subject: draft.subject, from: draft.from_address },
    })
    revalidatePath("/hub/inbox")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not dismiss that draft")
  }
}
