import { listCustomers } from "@/lib/hub/customers"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks, listTrailers } from "@/lib/hub/fleet"
import { query } from "@/lib/hub/db"
import { requireOfficeUser } from "@/lib/hub/session"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { PasteIntake } from "@/components/hub/PasteIntake"
import type { PriceBookOption } from "@/components/hub/LoadForm"

export const dynamic = "force-dynamic"

export default async function PasteIntakePage() {
  const user = await requireOfficeUser()
  const [customers, drivers, trucks, trailers, priceBook] = await Promise.all([
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

  return (
    <div>
      <BackLink href="/hub/dispatch" label="Dispatch" />
      <PageHeader title="Paste Intake" subtitle="Rate con text → dispatched load in under 60 seconds." />
      <PasteIntake
        customers={customers.map((c) => ({ id: c.id, label: c.name, mc: c.mc_number }))}
        drivers={drivers.filter((d) => d.status === "active").map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }))}
        trucks={trucks.filter((t) => t.status !== "retired").map((t) => ({ id: t.id, label: `#${t.unit_number}` }))}
        trailers={trailers.filter((t) => t.status !== "retired").map((t) => ({ id: t.id, label: `#${t.unit_number} · ${t.type.replace("_", " ")}` }))}
        priceBook={priceBook}
      />
    </div>
  )
}
