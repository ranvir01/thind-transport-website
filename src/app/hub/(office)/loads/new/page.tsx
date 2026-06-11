import { listCustomers } from "@/lib/hub/customers"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks, listTrailers } from "@/lib/hub/fleet"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { LoadForm } from "@/components/hub/LoadForm"
import { emptyLoadForm } from "@/lib/hub/form-defaults"

export const dynamic = "force-dynamic"

export default async function NewLoadPage() {
  const [customers, drivers, trucks, trailers] = await Promise.all([
    listCustomers(), listDrivers(), listTrucks(), listTrailers(),
  ])

  return (
    <div>
      <BackLink href="/hub/loads" label="Loads" />
      <PageHeader title="Book a Load" subtitle="Rate con in hand? Get it on the board." />
      <LoadForm
        initial={emptyLoadForm()}
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        drivers={drivers
          .filter((d) => d.status === "active")
          .map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }))}
        trucks={trucks
          .filter((t) => t.status !== "retired")
          .map((t) => ({ id: t.id, label: `#${t.unit_number}${t.make ? ` · ${t.make}` : ""}` }))}
        trailers={trailers
          .filter((t) => t.status !== "retired")
          .map((t) => ({ id: t.id, label: `#${t.unit_number} · ${t.type.replace("_", " ")}` }))}
      />
    </div>
  )
}
