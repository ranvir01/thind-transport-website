import { listDrivers } from "@/lib/hub/drivers"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { TruckForm } from "@/components/hub/FleetForms"
import { emptyTruck } from "@/lib/hub/form-defaults"

export const dynamic = "force-dynamic"

export default async function NewTruckPage() {
  const drivers = await listDrivers()
  return (
    <div>
      <BackLink href="/hub/fleet" label="Fleet" />
      <PageHeader title="Add Truck" subtitle="Paste the VIN and decode to fill the specs." />
      <TruckForm
        initial={emptyTruck()}
        drivers={drivers.filter((d) => d.status === "active").map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }))}
      />
    </div>
  )
}
