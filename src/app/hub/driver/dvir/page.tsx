import { requireDriverUser } from "@/lib/hub/session"
import { DVIR_CHECKLIST, truckDvirState } from "@/lib/hub/dvir"
import { queryOne } from "@/lib/hub/db"
import { DvirForm } from "@/components/hub/driver/DvirForm"
import { EmptyStateDark } from "@/components/hub/driver/EmptyStateDark"

export const dynamic = "force-dynamic"

export default async function DriverDvirPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const user = await requireDriverUser()
  const { type } = await searchParams

  // The driver's truck: their seated assignment, else their active load's truck.
  const truck = await queryOne<{ id: string; unit_number: string }>(
    `SELECT t.id, t.unit_number FROM hub.trucks t
     WHERE t.carrier_id = $1 AND t.deleted_at IS NULL
       AND (t.assigned_driver_id = $2 OR t.id = (
         SELECT l.truck_id FROM hub.loads l
         WHERE l.carrier_id = $1 AND l.driver_id = $2 AND l.deleted_at IS NULL
           AND l.status IN ('dispatched','at_pickup','in_transit','delivered')
         ORDER BY l.created_at DESC LIMIT 1
       ))
     ORDER BY (t.assigned_driver_id = $2) DESC LIMIT 1`,
    [user.carrierId, user.driverId]
  )

  if (!truck) {
    return (
      <EmptyStateDark
        title="No truck on record"
        hint="Once dispatch seats you in a truck, your inspections live here."
      />
    )
  }

  const { state, openDvir } = await truckDvirState(user.carrierId, truck.id)
  // Pre-trip when reviewing a prior post-trip (396.13), or when asked; else post-trip.
  const formType: "pre" | "post" =
    state === "awaiting_review" || state === "awaiting_repair" || type === "pre" ? "pre" : "post"

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-semibold text-white">
        Vehicle inspection
      </h1>
      <p className="text-body-sm text-steel-300 mb-4">
        {formType === "post"
          ? "End of day: walk the truck, tap anything broken, sign. Two minutes."
          : "Before you roll: review what was reported, check the truck, sign off."}
      </p>
      <DvirForm
        truck={truck}
        type={formType}
        checklistTemplate={[...DVIR_CHECKLIST]}
        priorDvir={formType === "pre" ? openDvir : null}
      />
    </div>
  )
}
