import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { listLoads } from "@/lib/hub/loads"
import { LOAD_STATUSES, STATUS_LABELS, formatMoney, loadTotal, type LoadStatus } from "@/lib/hub/types"
import { Panel, PageHeader, StatusBadge, EmptyState, fieldCls } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

export default async function LoadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const params = await searchParams
  const status = (params.status as LoadStatus | "active" | "all") || "active"
  const search = params.q?.trim() || undefined
  const loads = await listLoads({ status, search })

  return (
    <div>
      <PageHeader
        title="Loads"
        subtitle="Search, filter, and manage every load."
        action={
          <Link
            href="/hub/loads/new"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400"
          >
            <Plus className="h-4 w-4" /> New load
          </Link>
        }
      />

      {/* Filters */}
      <form method="GET" className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
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
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-[44px] rounded-xl border border-white/15 px-5 text-sm font-semibold text-steel-100 hover:bg-white/5"
        >
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
          {/* Desktop table */}
          <Panel className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-label text-steel-300 uppercase">
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Lane</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Driver / Truck</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((load) => (
                  <tr key={load.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <Link href={`/hub/loads/${load.id}`} className="font-bold text-white hover:text-gold">
                        {load.reference}
                      </Link>
                      {load.customer_reference ? (
                        <p className="text-body-xs text-steel-400">{load.customer_reference}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={load.status} /></td>
                    <td className="px-4 py-3 text-steel-100">
                      {load.origin_city ? `${load.origin_city}, ${load.origin_state}` : "—"}
                      {" → "}
                      {load.dest_city ? `${load.dest_city}, ${load.dest_state}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-steel-100">{load.customer_name ?? "—"}</td>
                    <td className="px-4 py-3 text-steel-100">
                      {load.driver_name ?? "Unassigned"}
                      {load.truck_unit ? ` · #${load.truck_unit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-display font-extrabold text-gold">
                      {formatMoney(loadTotal(load))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loads.map((load) => (
              <Link key={load.id} href={`/hub/loads/${load.id}`} className="block">
                <Panel className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{load.reference}</span>
                    <StatusBadge status={load.status} />
                  </div>
                  <p className="text-body-sm text-steel-200 mt-1">
                    {load.origin_city ? `${load.origin_city}, ${load.origin_state}` : "—"}
                    {" → "}
                    {load.dest_city ? `${load.dest_city}, ${load.dest_state}` : "—"}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="text-body-xs text-steel-300 truncate">
                      {load.customer_name ?? "—"} · {load.driver_name ?? "Unassigned"}
                    </p>
                    <span className="font-display font-extrabold text-gold">{formatMoney(loadTotal(load))}</span>
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
