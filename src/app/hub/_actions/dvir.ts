"use server"

import { revalidatePath } from "next/cache"
import { requireDriverUser, requirePermission } from "@/lib/hub/session"
import { certifyRepair, submitDvir, type DvirDefect } from "@/lib/hub/dvir"
import { notifyRoles } from "@/lib/hub/notify"
import { logAudit } from "@/lib/hub/audit"
import { queryOne } from "@/lib/hub/db"
import { dollarsToCents } from "@/lib/hub/types"

interface Result {
  ok: boolean
  error?: string
  grounded?: boolean
}

/** Driver submits a DVIR (their own truck only). */
export async function submitDvirAction(input: {
  truckId: string
  type: "pre" | "post"
  odometer?: string
  checklist: { key: string; label: string; ok: boolean }[]
  defects: DvirDefect[]
  safeToOperate: boolean
  signature: string
  priorDvirId?: string | null
}): Promise<Result> {
  try {
    const user = await requireDriverUser()
    if (!input.signature) return { ok: false, error: "Sign the report first" }
    const truck = await queryOne<{ id: string; unit_number: string }>(
      `SELECT id, unit_number FROM hub.trucks WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [user.carrierId, input.truckId]
    )
    if (!truck) return { ok: false, error: "Truck not found" }
    const { id, grounded } = await submitDvir(user.carrierId, {
      truckId: input.truckId,
      driverId: user.driverId,
      type: input.type,
      odometer: input.odometer ? Number(input.odometer.replace(/[^0-9.]/g, "")) || null : null,
      checklist: input.checklist,
      defects: input.defects,
      safeToOperate: input.safeToOperate,
      signature: input.signature,
      signedName: user.name,
      priorDvirId: input.priorDvirId ?? null,
    })
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "dvir", entityId: id, action: `submit_${input.type}_trip`,
      newValue: { truck: truck.unit_number, defects: input.defects.length, safe: input.safeToOperate },
    })
    if (grounded) {
      await notifyRoles(user.carrierId, ["owner", "dispatcher"], {
        kind: "dvir",
        title: `Truck #${truck.unit_number} grounded — unsafe DVIR defect`,
        body: input.defects.map((d) => d.label).join("; ").slice(0, 120),
        link: `/hub/fleet/trucks/${input.truckId}`,
      })
    } else if (input.defects.length > 0) {
      await notifyRoles(user.carrierId, ["owner", "dispatcher"], {
        kind: "dvir",
        title: `DVIR defects on #${truck.unit_number} (safe to operate)`,
        link: `/hub/fleet/trucks/${input.truckId}`,
      })
    }
    revalidatePath("/hub/driver")
    revalidatePath(`/hub/fleet/trucks/${input.truckId}`)
    return { ok: true, grounded }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not file the DVIR" }
  }
}

/** Office certifies the repair on a defective post-trip. */
export async function certifyRepairAction(
  dvirId: string,
  truckId: string,
  input: { vendor: string; cost: string; notes: string }
): Promise<Result> {
  try {
    const user = await requirePermission("fleet:write")
    if (!input.vendor.trim()) return { ok: false, error: "Who did the repair?" }
    const ok = await certifyRepair(
      user.carrierId,
      dvirId,
      {
        vendor: input.vendor.trim(),
        costCents: dollarsToCents(input.cost),
        notes: input.notes.trim() || "Repair completed",
      },
      { id: user.id, name: user.name }
    )
    if (!ok) return { ok: false, error: "Already certified" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "dvir", entityId: dvirId, action: "repair_certified",
      newValue: { vendor: input.vendor, cost: input.cost },
    })
    revalidatePath(`/hub/fleet/trucks/${truckId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not certify" }
  }
}
