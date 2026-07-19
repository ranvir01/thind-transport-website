import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { listLoads } from "@/lib/hub/loads"
import { getRecurringLanesOverview } from "@/lib/hub/recurring"
import { requireOfficeUser } from "@/lib/hub/session"
import { RecurringLanesPanel } from "@/components/hub/RecurringLanesPanel"
import { LOAD_STATUSES, STATUS_LABELS, fmtCents, loadTotalCents, type LoadStatus } from "@/lib/hub/types"
import {
  btnPrimaryCls,
  btnSecondaryCls,
  EmptyState,
  fieldCls,
  linkAccentCls,
  moneyCls,
  PageHeader,
  Panel,
  StatusBadge,
  tableHeadCls,
} from "@/components/hub/ui"

export const dynamic = "force-dynamic"

export default async function LoadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const user = await requireOfficeUser()
  const params = await searchParams
  const status = (params.status as LoadStatus | "active" | "all") || "active"
  const search = params.q?.trim() || undefined
  const [loads, recurring] = await Promise.all([
    listLoads(user.carrierId, { status, search }),
    getRecurringLanesOverview(user.carrierId),
  ])

  return (
    <div>
      <PageHeader
        title="Loads"
        subtitle="Search, filter, and manage every load."
        action={
          <Link href="/hub/loads/new" className={btnPrimaryCls}>
            <Plus className="h-4 w-4" /> New load
          </Link>
        }
      />

      <RecurringLanesPanel rows={recurring} />

      <form method="GET" className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" />
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search reference, broker, city, commodity…"
            className={`${fieldCls} pl-9`}
          />
        </div>
        <select name="status" defaultValue={status} className={`${fieldCls} sm:w-48`}>
          <option value="active">Active</option>
          <option value="all">All</option>
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
          title="No loads match"
          hint="Adjust the filters, book a new load, or import your spreadsheet history."
        />
      ) : (
        <>
          <Panel className="hidden overflow-x-auto md:block">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className={tableHeadCls}>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Lane</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Driver / truck</th>
                  <th className="px-4 py-3">Billing</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((load) => (
                  <tr key={load.id} className="border-b border-border last:border-0 hover:bg-hover">
                    <td className="px-4 py-3">
                      <Link href={`/hub/loads/${load.id}`} className={`font-mono text-sm ${linkAccentCls}`}>
                        {load.reference}
                      </Link>
                      {load.customer_reference ? (
                        <p className="text-xs text-fg-3">{load.customer_reference}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={load.status} />
                    </td>
                    <td className="px-4 py-3 text-fg-2">
                      {load.origin_city ? `${load.origin_city}, ${load.origin_state}` : "—"}
                      {" → "}
                      {load.dest_city ? `${load.dest_city}, ${load.dest_state}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-fg-2">{load.customer_name ?? "—"}</td>
                    <td className="px-4 py-3 text-fg-2">
                      {load.driver_name ?? "Unassigned"}
                      {load.truck_unit ? ` · #${load.truck_unit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium uppercase text-fg-3">
                      {load.invoice_status ?? (load.settlement_id ? "settled" : "—")}
                    </td>
                    <td className={`px-4 py-3 text-right text-base ${moneyCls}`}>{fmtCents(loadTotalCents(load))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <div className="space-y-2 md:hidden">
            {loads.map((load) => (
              <Link key={load.id} href={`/hub/loads/${load.id}`} className="block">
                <Panel className="p-3.5 transition-colors hover:bg-hover">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-fg">{load.reference}</span>
                    <StatusBadge status={load.status} />
                  </div>
                  <p className="mt-1 text-sm text-fg-2">
                    {load.origin_city ? `${load.origin_city}, ${load.origin_state}` : "—"}
                    {" → "}
                    {load.dest_city ? `${load.dest_city}, ${load.dest_state}` : "—"}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-fg-3">
                      {load.customer_name ?? "—"} · {load.driver_name ?? "Unassigned"}
                    </p>
                    <span className={moneyCls}>{fmtCents(loadTotalCents(load))}</span>
                  </div>
                </Panel>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
