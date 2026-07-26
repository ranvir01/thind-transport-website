import { notFound } from "next/navigation"
import { getTruck } from "@/lib/hub/fleet"
import { requireOfficeUser } from "@/lib/hub/session"
import { listDrivers } from "@/lib/hub/drivers"
import { listDocuments } from "@/lib/hub/documents"
import { query } from "@/lib/hub/db"
import { truckOdometers } from "@/lib/hub/compliance"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { TruckForm, type TruckFormState } from "@/components/hub/FleetForms"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"
import { MaintenancePanel, type MaintenanceRecord, type MaintenanceSchedule } from "@/components/hub/MaintenancePanel"
import { DvirPanel } from "@/components/hub/DvirPanel"
import { listDvirsForTruck, truckDvirState } from "@/lib/hub/dvir"

export const dynamic = "force-dynamic"

export default async function TruckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const truck = await getTruck(user.carrierId, id).catch(() => null)
  if (!truck) notFound()
  const [drivers, documents, dvirs, dvirState, schedules, records, odometerByTruck] = await Promise.all([
    listDrivers(user.carrierId),
    listDocuments(user.carrierId, "truck", id),
    listDvirsForTruck(user.carrierId, id),
    truckDvirState(user.carrierId, id),
    query<MaintenanceSchedule>(
      `SELECT id, name, interval_miles, interval_days, last_done_on, last_done_odometer FROM hub.maintenance_schedules
       WHERE carrier_id = $1 AND truck_id = $2 ORDER BY name`,
      [user.carrierId, id]
    ),
    query<MaintenanceRecord>(
      `SELECT id, done_on, vendor, cost_cents, odometer, notes FROM hub.maintenance_records
       WHERE carrier_id = $1 AND truck_id = $2 ORDER BY done_on DESC LIMIT 20`,
      [user.carrierId, id]
    ),
    truckOdometers(user.carrierId),
  ])

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
    tank_capacity_gallons: truck.tank_capacity_gallons?.toString() ?? "",
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
        <div className="max-w-2xl space-y-4">
          <DvirPanel truckId={id} dvirs={dvirs} state={dvirState.state} openDvir={dvirState.openDvir} />
          <DocumentsPanel entityType="truck" entityId={id} documents={documents} />
          <MaintenancePanel truckId={id} schedules={schedules} records={records} currentOdometer={odometerByTruck.get(id) ?? null} />
        </div>
      </div>
    </div>
  )
}
