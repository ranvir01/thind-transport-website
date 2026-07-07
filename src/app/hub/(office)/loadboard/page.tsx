import Link from "next/link"
import { Search } from "lucide-react"
import { DatFreightSearch } from "@/components/hub/DatFreightSearch"
import { TruckstopFreightSearch } from "@/components/hub/TruckstopFreightSearch"
import { LoadBoardGrid } from "@/components/hub/LoadBoardGrid"
import { EmptyState, PageHeader, fieldCls, btnSecondaryCls } from "@/components/hub/ui"
import { listCustomers } from "@/lib/hub/customers"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks } from "@/lib/hub/fleet"
import { listLoads } from "@/lib/hub/loads"
import { hasCredentials } from "@/lib/hub/credentials"
import { can } from "@/lib/hub/permissions"
import { requireOfficeUser } from "@/lib/hub/session"
import { LOAD_STATUSES, STATUS_LABELS, type LoadStatus } from "@/lib/hub/types"

export const dynamic = "force-dynamic"

export default async function LoadBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const user = await requireOfficeUser()
  const params = await searchParams
  const status = (params.status as LoadStatus | "active" | "all") || "active"
  const search = params.q?.trim() || undefined

  const [loads, drivers, trucks, customers, datConnected, truckstopConnected] = await Promise.all([
    listLoads(user.carrierId, { status, search }),
    listDrivers(user.carrierId),
    listTrucks(user.carrierId),
    listCustomers(user.carrierId),
    hasCredentials(user.carrierId, "dat"),
    hasCredentials(user.carrierId, "truckstop"),
  ])

  const canEdit = can(user.role, "loads:write")
  const activeDrivers = drivers.filter((d) => d.status === "active")
  const activeTrucks = trucks.filter((t) => t.status === "active")

  return (
    <div>
      <PageHeader
        title="Load board"
        subtitle="Your booked loads — click any cell to edit, like Excel."
      />

      <DatFreightSearch
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        canBook={canEdit}
        datConnected={datConnected}
      />

      <TruckstopFreightSearch
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        canBook={canEdit}
        truckstopConnected={truckstopConnected}
      />

      <form method="GET" className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" />
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search ref, broker #, city, customer…"
            className={`${fieldCls} pl-9`}
          />
        </div>
        <select name="status" defaultValue={status} className={`${fieldCls} sm:w-48`}>
          <option value="active">Active loads</option>
          <option value="all">All loads</option>
          {LOAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button type="submit" className={btnSecondaryCls}>
          Filter
        </button>
      </form>

      {loads.length === 0 ? (
        <EmptyState
          title="No loads on the board"
          hint="Book a load, paste a rate con, or import your spreadsheet history."
          action={
            <Link href="/hub/loads/new" className={btnSecondaryCls}>
              New load
            </Link>
          }
        />
      ) : (
        <LoadBoardGrid
          loads={loads}
          drivers={activeDrivers}
          trucks={activeTrucks}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}
