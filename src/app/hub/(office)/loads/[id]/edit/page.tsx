import { notFound } from "next/navigation"
import { getLoad, getLoadStops } from "@/lib/hub/loads"
import { listCustomers } from "@/lib/hub/customers"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks, listTrailers } from "@/lib/hub/fleet"
import { query } from "@/lib/hub/db"
import { requireOfficeUser } from "@/lib/hub/session"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { LoadForm, type LoadFormInitial, type PriceBookOption } from "@/components/hub/LoadForm"

export const dynamic = "force-dynamic"

function toLocalInput(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default async function EditLoadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const load = await getLoad(user.carrierId, id).catch(() => null)
  if (!load) notFound()
  const [stops, customers, drivers, trucks, trailers, priceBook] = await Promise.all([
    getLoadStops(user.carrierId, id),
    listCustomers(user.carrierId),
    listDrivers(user.carrierId),
    listTrucks(user.carrierId),
    listTrailers(user.carrierId),
    query<PriceBookOption>(
      `SELECT id, name, default_amount_cents, unit FROM hub.accessorial_types
       WHERE carrier_id = $1 AND active = TRUE ORDER BY name`,
      [user.carrierId]
    ),
  ])

  const initial: LoadFormInitial = {
    customer_id: load.customer_id ?? "",
    customer_reference: load.customer_reference ?? "",
    equipment: load.equipment,
    commodity: load.commodity ?? "",
    weight_lbs: load.weight_lbs?.toString() ?? "",
    linehaul: (load.linehaul_cents / 100).toFixed(2),
    fuel_surcharge: (load.fuel_surcharge_cents / 100).toFixed(2),
    loaded_miles: load.loaded_miles?.toString() ?? "",
    deadhead_miles: load.deadhead_miles?.toString() ?? "",
    truck_id: load.truck_id ?? "",
    trailer_id: load.trailer_id ?? "",
    driver_id: load.driver_id ?? "",
    factored: load.factored,
    notes: load.notes ?? "",
    stops: stops.map((s) => ({
      type: s.type,
      facility: s.facility ?? "",
      address: s.address ?? "",
      city: s.city,
      state: s.state,
      zip: s.zip ?? "",
      pickup_number: s.pickup_number ?? "",
      po_number: s.po_number ?? "",
      fcfs: s.fcfs,
      appt_start: toLocalInput(s.appt_start),
      notes: s.notes ?? "",
    })),
    accessorials: (Array.isArray(load.accessorials) ? load.accessorials : []).map((a) => ({
      label: a.label,
      amount: (a.amount_cents / 100).toFixed(2),
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
        priceBook={priceBook}
      />
    </div>
  )
}
