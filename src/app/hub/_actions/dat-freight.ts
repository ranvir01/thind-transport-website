"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { createLoad } from "@/lib/hub/loads"
import { geocodeCityState } from "@/lib/hub/geocode"
import { logAudit } from "@/lib/hub/audit"
import { hasCredentials } from "@/lib/hub/credentials"
import {
  datPostingToLoadDraft,
  datSource,
  normalizeDatPosting,
  type DatLoadPosting,
  type DatSearchCriteria,
} from "@/lib/hub/integrations/dat"
import type { StopInput } from "@/lib/hub/loads"
import { actionError } from "@/lib/hub/action-error"

interface ActionResult {
  ok: boolean
  error?: string
  id?: string
}

export interface DatFreightSearchResult {
  ok: boolean
  error?: string
  connected?: boolean
  postings?: DatLoadPosting[]
}

async function geocodeStops(stops: StopInput[]): Promise<StopInput[]> {
  const result: StopInput[] = []
  for (const stop of stops) {
    const coords = await geocodeCityState(stop.city, stop.state)
    result.push({ ...stop, lat: coords?.lat ?? null, lng: coords?.lng ?? null })
  }
  return result
}

export async function searchDatFreightAction(
  criteria: DatSearchCriteria
): Promise<DatFreightSearchResult> {
  try {
    const user = await requirePermission("loads:read")
    const connected = await hasCredentials(user.carrierId, "dat")
    if (!connected) {
      return {
        ok: false,
        connected: false,
        error: "DAT isn't connected — save credentials under Settings → Integrations first.",
      }
    }
    const postings = await datSource(user.carrierId).search(criteria)
    return { ok: true, connected: true, postings }
  } catch (err) {
    return actionError(err, "DAT search failed")
  }
}

export async function bookDatPostingAction(
  customerId: string,
  postingRaw: Record<string, unknown>
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("loads:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }

  if (!customerId?.trim()) {
    return { ok: false, error: "Pick a customer before booking this posting" }
  }

  try {
    const posting = normalizeDatPosting(postingRaw)
    if (!posting.external_id) {
      return { ok: false, error: "Posting is missing a match id" }
    }
    const draft = datPostingToLoadDraft(posting)
    const stops = await geocodeStops(draft.stops)
    const load = await createLoad(
      user.carrierId,
      { ...draft, customer_id: customerId.trim(), stops, source: "dat" },
      { id: user.id, name: user.name }
    )
    await logAudit({
      carrierId: user.carrierId,
      actorId: user.id,
      actorName: user.name,
      entityType: "load",
      entityId: load.id,
      action: "create",
      newValue: {
        reference: load.reference,
        source: "dat",
        dat_match_id: posting.external_id,
        linehaul_cents: load.linehaul_cents,
      },
    })
    revalidatePath("/hub/loadboard")
    revalidatePath("/hub/loads")
    revalidatePath(`/hub/loads/${load.id}`)
    return { ok: true, id: load.id }
  } catch (err) {
    return actionError(err, "Could not book posting")
  }
}
