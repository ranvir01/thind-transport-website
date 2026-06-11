import { notFound } from "next/navigation"
import { getTruck } from "@/lib/hub/fleet"
import { listDrivers } from "@/lib/hub/drivers"
import { listDocuments } from "@/lib/hub/documents"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { TruckForm, type TruckFormState } from "@/components/hub/FleetForms"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"

export const dynamic = "force-dynamic"

export default async function TruckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const truck = await getTruck(id).catch(() => null)
  if (!truck) notFound()
  const [drivers, documents] = await Promise.all([listDrivers(), listDocuments("truck", id)])

  const initial: TruckFormState = {
    unit_number: truck.unit_number,
    vin: truck.vin ?? "",
    plate: truck.plate ?? "",
    plate_state: truck.plate_state ?? "",
    year: truck.year?.toString() ?? "",
    make: truck.make ?? "",
    model: truck.model ?? "",
    ownership: truck.ownership,
    status: truck.status,
    registration_expiry: truck.registration_expiry?.toString().slice(0, 10) ?? "",
    inspection_due: truck.inspection_due?.toString().slice(0, 10) ?? "",
    insurance_expiry: truck.insurance_expiry?.toString().slice(0, 10) ?? "",
    assigned_driver_id: truck.assigned_driver_id ?? "",
    notes: truck.notes ?? "",
  }

  return (
    <div>
      <BackLink href="/hub/fleet" label="Fleet" />
      <PageHeader title={`Truck #${truck.unit_number}`} subtitle={[truck.year, truck.make, truck.model].filter(Boolean).join(" ")} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TruckForm
          truckId={id}
          initial={initial}
          drivers={drivers.filter((d) => d.status === "active").map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }))}
        />
        <div className="max-w-2xl">
          <DocumentsPanel entityType="truck" entityId={id} documents={documents} />
        </div>
      </div>
    </div>
  )
}
