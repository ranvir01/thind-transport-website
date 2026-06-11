import { notFound } from "next/navigation"
import { getLoad, getLoadStops } from "@/lib/hub/loads"
import { listCustomers } from "@/lib/hub/customers"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks, listTrailers } from "@/lib/hub/fleet"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { LoadForm, type LoadFormInitial } from "@/components/hub/LoadForm"

export const dynamic = "force-dynamic"

function toLocalInput(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default async function EditLoadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const load = await getLoad(id).catch(() => null)
  if (!load) notFound()
  const [stops, customers, drivers, trucks, trailers] = await Promise.all([
    getLoadStops(id), listCustomers(), listDrivers(), listTrucks(), listTrailers(),
  ])

  const initial: LoadFormInitial = {
    customer_id: load.customer_id ?? "",
    customer_reference: load.customer_reference ?? "",
    equipment: load.equipment,
    commodity: load.commodity ?? "",
    weight_lbs: load.weight_lbs?.toString() ?? "",
    linehaul: Number(load.linehaul).toString(),
    fuel_surcharge: Number(load.fuel_surcharge).toString(),
    loaded_miles: load.loaded_miles?.toString() ?? "",
    deadhead_miles: load.deadhead_miles?.toString() ?? "",
    truck_id: load.truck_id ?? "",
    trailer_id: load.trailer_id ?? "",
    driver_id: load.driver_id ?? "",
    notes: load.notes ?? "",
    stops: stops.map((s) => ({
      type: s.type,
      facility: s.facility ?? "",
      address: s.address ?? "",
      city: s.city,
      state: s.state,
      zip: s.zip ?? "",
      appt_start: toLocalInput(s.appt_start),
      notes: s.notes ?? "",
    })),
    accessorials: (Array.isArray(load.accessorials) ? load.accessorials : []).map((a) => ({
      label: a.label,
      amount: String(a.amount),
    })),
  }

  return (
    <div>
      <BackLink href={`/hub/loads/${id}`} label={load.reference} />
      <PageHeader title={`Edit ${load.reference}`} subtitle="Editing stops re-creates the stop list — arrival/departure times reset." />
      <LoadForm
        loadId={id}
        initial={initial}
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        drivers={drivers.filter((d) => d.status === "active").map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }))}
        trucks={trucks.filter((t) => t.status !== "retired").map((t) => ({ id: t.id, label: `#${t.unit_number}${t.make ? ` · ${t.make}` : ""}` }))}
        trailers={trailers.filter((t) => t.status !== "retired").map((t) => ({ id: t.id, label: `#${t.unit_number} · ${t.type.replace("_", " ")}` }))}
      />
    </div>
  )
}
