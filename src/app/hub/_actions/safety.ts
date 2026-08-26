"use server"

import { revalidatePath } from "next/cache"
import { requirePermission, requireDriverUser } from "@/lib/hub/session"
import { createIncident, updateIncident, type IncidentInput } from "@/lib/hub/incidents"
import { createClaim, updateClaim, type ClaimKind, type ClaimStatus } from "@/lib/hub/claims"
import { dollarsToCents } from "@/lib/hub/types"
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
  try {
    // requireDriverUser re-checks `active` + carrier status on every call
    // (JWT sessions otherwise keep a deactivated/suspended driver live for
    // ~30 days). The hand-rolled getHubUser + role check skipped both.
    const user = await requireDriverUser()
    const { queryOne } = await import("@/lib/hub/db")

    // The driver's current truck (if assigned) rides along automatically.
    const truck = await queryOne<{ id: string }>(
      `SELECT id FROM hub.trucks WHERE carrier_id = $1 AND assigned_driver_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [user.carrierId, user.driverId]
    )

    const incident = await createIncident(
      user.carrierId,
      {
        driverId: user.driverId,
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

export interface ClaimFormInput {
  kind: ClaimKind
  status: ClaimStatus
  loadId?: string | null
  incidentId?: string | null
  /** Dollars as typed ("1250.00"); blank clears the amount. */
  amount?: string
  filingDeadline?: string | null
  notes?: string | null
}

/**
 * Office-side claim entry/edit (compliance:write). Money-adjacent
 * (amount_cents), so every save is audited.
 */
export async function saveClaim(
  id: string | null,
  input: ClaimFormInput
): Promise<IncidentFormResult> {
  let user
  try {
    user = await requirePermission("compliance:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const amountCents =
      input.amount === undefined || input.amount.trim() === ""
        ? null
        : dollarsToCents(input.amount)
    const fields = {
      kind: input.kind,
      status: input.status,
      loadId: input.loadId || null,
      incidentId: input.incidentId || null,
      amountCents,
      filingDeadline: input.filingDeadline || null,
      notes: input.notes || null,
    }
    const claim = id
      ? await updateClaim(user.carrierId, id, fields)
      : await createClaim(user.carrierId, fields)
    if (!claim) return { ok: false, error: "Claim not found" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "claim", entityId: claim.id,
      action: id ? "update" : "create",
      newValue: { kind: fields.kind, status: fields.status, amountCents, loadId: fields.loadId },
    })
    revalidatePath("/hub/safety/claims")
    revalidatePath("/hub/safety")
    return { ok: true, id: claim.id }
  } catch (err) {
    return actionError(err, "Could not save claim")
  }
}
