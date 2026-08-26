import { notFound } from "next/navigation"
import { requirePermissionPage } from "@/lib/hub/session"
import { getIncident } from "@/lib/hub/incidents"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks } from "@/lib/hub/fleet"
import { listDocuments } from "@/lib/hub/documents"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { IncidentForm } from "@/components/hub/IncidentForm"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"

export const dynamic = "force-dynamic"

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionPage("compliance:read")
  const { id } = await params
  const incident = await getIncident(user.carrierId, id).catch(() => null)
  if (!incident) notFound()
  const [drivers, trucks, documents] = await Promise.all([
    listDrivers(user.carrierId),
    listTrucks(user.carrierId),
    listDocuments(user.carrierId, "incident", id),
  ])

  return (
    <div>
      <BackLink href="/hub/safety" label="Safety" />
      <PageHeader
        title={`Incident — ${new Date(incident.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        subtitle={incident.reported_by_name ? `First reported by ${incident.reported_by_name}` : undefined}
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <IncidentForm
          incidentId={id}
          initial={{
            occurredAt: toLocalInput(incident.occurred_at),
            location: incident.location ?? "",
            description: incident.description ?? "",
            policeReport: incident.police_report ?? "",
            truckId: incident.truck_id ?? "",
            driverId: incident.driver_id ?? "",
            fatality: incident.fatality,
            injuryTreatedAway: incident.injury_treated_away,
            towAwayDisabling: incident.tow_away_disabling,
            status: incident.status,
          }}
          trucks={trucks.map((t) => ({ id: t.id, unit_number: t.unit_number }))}
          drivers={drivers.map((d) => ({ id: d.id, name: `${d.first_name} ${d.last_name}` }))}
        />
        <div className="max-w-2xl">
          <DocumentsPanel entityType="incident" entityId={id} documents={documents} />
        </div>
      </div>
    </div>
  )
}
