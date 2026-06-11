import { requirePermissionPage } from "@/lib/hub/session"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks } from "@/lib/hub/fleet"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { IncidentForm } from "@/components/hub/IncidentForm"

export const dynamic = "force-dynamic"

export default async function NewIncidentPage() {
  const user = await requirePermissionPage("compliance:write")
  const [drivers, trucks] = await Promise.all([
    listDrivers(user.carrierId),
    listTrucks(user.carrierId),
  ])

  return (
    <div>
      <BackLink href="/hub/safety" label="Safety" />
      <PageHeader title="Log an incident" subtitle="Three plain questions decide whether DOT counts it as an accident." />
      <IncidentForm
        incidentId={null}
        initial={{
          occurredAt: new Date().toISOString().slice(0, 16),
          location: "",
          description: "",
          policeReport: "",
          truckId: "",
          driverId: "",
          fatality: false,
          injuryTreatedAway: false,
          towAwayDisabling: false,
          status: "open",
        }}
        trucks={trucks.map((t) => ({ id: t.id, unit_number: t.unit_number }))}
        drivers={drivers.map((d) => ({ id: d.id, name: `${d.first_name} ${d.last_name}` }))}
      />
    </div>
  )
}
