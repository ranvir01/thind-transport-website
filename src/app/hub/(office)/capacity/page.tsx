import { requireOfficeUser } from "@/lib/hub/session"
import { listTrucks } from "@/lib/hub/fleet"
import { query } from "@/lib/hub/db"
import { PageHeader } from "@/components/hub/ui"
import { CapacityPanel, type CapacityRow } from "@/components/hub/CapacityPanel"

export const dynamic = "force-dynamic"

export default async function CapacityPage() {
  const user = await requireOfficeUser()
  const [trucks, postings] = await Promise.all([
    listTrucks(user.carrierId),
    query<CapacityRow>(
      `SELECT p.id, t.unit_number AS truck_unit, p.equipment, p.available_on,
         p.origin_city, p.origin_state, p.dest_preference, p.note
       FROM hub.capacity_postings p
       LEFT JOIN hub.trucks t ON t.id = p.truck_id AND t.carrier_id = p.carrier_id
       WHERE p.carrier_id = $1 AND p.active AND p.available_on >= CURRENT_DATE - 1
       ORDER BY p.available_on`,
      [user.carrierId]
    ),
  ])

  return (
    <div>
      <PageHeader
        title="Posted capacity"
        subtitle="Empty trucks, advertised — postings surface on the public load-board page in real time."
      />
      <CapacityPanel
        trucks={trucks.filter((t) => t.status === "active").map((t) => ({ id: t.id, unit_number: t.unit_number }))}
        postings={postings}
      />
    </div>
  )
}
