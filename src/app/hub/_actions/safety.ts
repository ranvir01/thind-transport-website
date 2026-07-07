"use server"

import { revalidatePath } from "next/cache"
import { requirePermission, getHubUser } from "@/lib/hub/session"
import { createIncident, updateIncident, type IncidentInput } from "@/lib/hub/incidents"
import { notifyRoles } from "@/lib/hub/notify"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"

export interface IncidentFormResult {
  ok: boolean
  id?: string
  error?: string
}

/** Office-side incident entry (compliance:write). */
export async function saveIncident(
  id: string | null,
  input: IncidentInput & { status?: "open" | "under_review" | "closed" }
): Promise<IncidentFormResult> {
  let user
  try {
    user = await requirePermission("compliance:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const incident = id
      ? await updateIncident(user.carrierId, id, input)
      : await createIncident(user.carrierId, input, { id: user.id, name: user.name })
    if (!incident) return { ok: false, error: "Incident not found" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "incident", entityId: incident.id,
      action: id ? "update" : "create",
      newValue: {
        fatality: input.fatality, injuryTreatedAway: input.injuryTreatedAway,
        towAwayDisabling: input.towAwayDisabling, status: input.status ?? "open",
      },
    })
    revalidatePath("/hub/safety")
    return { ok: true, id: incident.id }
  } catch (err) {
    return actionError(err, "Could not save incident")
  }
}

/**
 * Driver first report from the scene (driver role — their own record only).
 * Plain-language 390.5 questions come from the driver app form.
 */
export async function fileDriverIncidentReport(input: {
  occurredAt: string
  location: string
  description: string
  policeReport?: string | null
  fatality: boolean
  injuryTreatedAway: boolean
  towAwayDisabling: boolean
  loadId?: string | null
  lat?: number | null
  lng?: number | null
}): Promise<IncidentFormResult> {
  const user = await getHubUser()
  if (!user || user.role !== "driver") return { ok: false, error: "Drivers only" }
  const { queryOne } = await import("@/lib/hub/db")
  const me = await queryOne<{ driver_id: string | null }>(
    `SELECT driver_id FROM hub.users WHERE id = $1 AND carrier_id = $2`,
    [user.id, user.carrierId]
  )
  if (!me?.driver_id) return { ok: false, error: "No driver record linked to this account" }

  // The driver's current truck (if assigned) rides along automatically.
  const truck = await queryOne<{ id: string }>(
    `SELECT id FROM hub.trucks WHERE carrier_id = $1 AND assigned_driver_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [user.carrierId, me.driver_id]
  )

  try {
    const incident = await createIncident(
      user.carrierId,
      {
        driverId: me.driver_id,
        truckId: truck?.id ?? null,
        loadId: input.loadId ?? null,
        occurredAt: input.occurredAt,
        location: input.location,
        description: input.description,
        policeReport: input.policeReport ?? null,
        fatality: input.fatality,
        injuryTreatedAway: input.injuryTreatedAway,
        towAwayDisabling: input.towAwayDisabling,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      },
      { id: user.id, name: user.name }
    )
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "incident", entityId: incident.id, action: "driver_first_report",
      newValue: { location: input.location },
    })
    await notifyRoles(user.carrierId, ["owner", "dispatcher"], {
      kind: "incident",
      title: `Incident reported by ${user.name}`,
      body: input.location ? `At ${input.location}` : undefined,
      link: `/hub/safety`,
    })
    revalidatePath("/hub/safety")
    return { ok: true, id: incident.id }
  } catch (err) {
    return actionError(err, "Could not file report")
  }
}
