"use server"

/** Facility intelligence actions (E2). */
import { revalidatePath } from "next/cache"
import { requireOfficeUser } from "@/lib/hub/session"
import {
  addFacilityNote, detentionRisk, formatDwell, updateFacilityInfo,
} from "@/lib/hub/facilities"
import { getCarrierSettings } from "@/lib/hub/settings"
import { queryOne } from "@/lib/hub/db"
import { dollarsToCents } from "@/lib/hub/types"

interface Result {
  ok: boolean
  error?: string
}

/**
 * Booking-time lookup: as dispatch types a facility on the load form, warn
 * when history says this place eats clocks ("averages 3h 40m at the dock").
 */
export async function facilityLookupAction(input: {
  name: string
  city?: string
  state?: string
}): Promise<{
  found: boolean
  facilityId?: string
  warning?: string | null
  noteCount?: number
}> {
  try {
    const user = await requireOfficeUser()
    if (!input.name?.trim()) return { found: false }
    const row = await queryOne<{
      id: string
      avg_dwell: number | null
      note_count: number
    }>(
      `SELECT f.id,
         (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (s.departed_at - s.arrived_at)) / 60))::int
            FROM hub.stops s
            WHERE s.facility_id = f.id AND s.arrived_at IS NOT NULL AND s.departed_at IS NOT NULL
              AND s.departed_at > s.arrived_at) AS avg_dwell,
         (SELECT COUNT(*)::int FROM hub.facility_notes n WHERE n.facility_id = f.id) AS note_count
       FROM hub.facilities f
       WHERE f.carrier_id = $1 AND lower(f.name) = lower($2)
         AND ($3 = '' OR lower(coalesce(f.city, '')) = lower($3))
       ORDER BY (lower(coalesce(f.state,'')) = lower($4)) DESC
       LIMIT 1`,
      [user.carrierId, input.name.trim(), input.city?.trim() ?? "", input.state?.trim() ?? ""]
    )
    if (!row) return { found: false }
    const settings = await getCarrierSettings(user.carrierId)
    const freeMinutes = Math.round((settings.detention.freeHours ?? 2) * 60)
    const risk = detentionRisk(row.avg_dwell, freeMinutes)
    return {
      found: true,
      facilityId: row.id,
      noteCount: row.note_count,
      warning:
        risk && row.avg_dwell != null
          ? `Heads up: this place averages ${formatDwell(row.avg_dwell)} at the dock${risk === "high" ? " — past your free time. Price detention in." : "."}`
          : null,
    }
  } catch {
    return { found: false }
  }
}

export async function updateFacilityAction(
  id: string,
  patch: {
    hours?: string
    phone?: string
    overnightParking?: "yes" | "no" | ""
    typicalLumper?: string
    notes?: string
  }
): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    await updateFacilityInfo(user.carrierId, id, {
      hours: patch.hours?.trim() || null,
      phone: patch.phone?.trim() || null,
      overnightParking:
        patch.overnightParking === "yes" ? true : patch.overnightParking === "no" ? false : null,
      typicalLumperCents: patch.typicalLumper ? dollarsToCents(patch.typicalLumper) : null,
      notes: patch.notes?.trim() || null,
    })
    revalidatePath(`/hub/facilities/${id}`)
    revalidatePath("/hub/facilities")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save" }
  }
}

export async function addOfficeFacilityNoteAction(
  facilityId: string,
  body: string,
  tags: string[]
): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    if (!body.trim() && tags.length === 0) return { ok: false, error: "Write something first" }
    await addFacilityNote(user.carrierId, facilityId, {
      body: body.trim() || tags.join(", "),
      tags,
      author: { id: user.id, name: user.name, role: user.role },
    })
    revalidatePath(`/hub/facilities/${facilityId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not add the note" }
  }
}
