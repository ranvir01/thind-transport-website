import Link from "next/link"
import { Download } from "lucide-react"
import { truckPnl } from "@/lib/hub/expenses"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

// API download endpoint (not a page) — held in a const so the page-link lint rule doesn't misfire.
const PNL_EXPORT_URL = "/api/hub/exports/pnl"

export default async function ReportsPage() {
  const user = await requirePermissionPage("money:read")
  const pnl = await truckPnl(user.carrierId, 92)
  const totals = pnl.reduce(
    (acc, row) => ({
      revenue: acc.revenue + Number(row.revenue_cents),
      fuel: acc.fuel + Number(row.fuel_cents),
      maintenance: acc.maintenance + Number(row.maintenance_cents),
      other: acc.other + Number(row.other_expense_cents),
      net: acc.net + row.net_cents,
    }),
    { revenue: 0, fuel: 0, maintenance: 0, other: 0, net: 0 }
  )

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Per-truck P&L, last 92 days. Driver pay and fixed costs come from the accountant's books — this is the operational view."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/hub/reports/builder" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-steel-100 hover:bg-white/5">
              Report builder
            </Link>
            <a
              href={PNL_EXPORT_URL}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 text-sm font-bold text-gold hover:bg-gold/20"
            >
              <Download className="h-4 w-4" /> P&L CSV
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Panel className="p-4"><span className="text-label text-steel-300 uppercase">Revenue</span><p className="mt-2 font-display text-xl font-extrabold text-gold">{fmtCents(totals.revenue)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-steel-300 uppercase">Fuel</span><p className="mt-2 font-display text-xl font-extrabold text-white">{fmtCents(totals.fuel)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-steel-300 uppercase">Maintenance</span><p className="mt-2 font-display text-xl font-extrabold text-white">{fmtCents(totals.maintenance)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-steel-300 uppercase">Other</span><p className="mt-2 font-display text-xl font-extrabold text-white">{fmtCents(totals.other)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-steel-300 uppercase">Net</span><p className={`mt-2 font-display text-xl font-extrabold ${totals.net >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmtCents(totals.net)}</p></Panel>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-label text-steel-300 uppercase">
              <th className="px-4 py-3">Truck</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Fuel</th>
              <th className="px-4 py-3 text-right">Maint.</th>
              <th className="px-4 py-3 text-right">Other</th>
              <th className="px-4 py-3 text-right">Net</th>
              <th className="px-4 py-3 text-right">Net/mi</th>
            </tr>
          </thead>
          <tbody>
            {pnl.map((row) => {
              const miles = Number(row.loaded_miles ?? 0)
              return (
                <tr key={row.truck_id} className="border-b border-white/5">
                  <td className="px-4 py-2.5 font-bold text-white">#{row.unit_number}</td>
                  <td className="px-4 py-2.5 text-right text-gold font-semibold">{fmtCents(Number(row.revenue_cents))}</td>
                  <td className="px-4 py-2.5 text-right text-steel-100">{fmtCents(Number(row.fuel_cents))}</td>
                  <td className="px-4 py-2.5 text-right text-steel-100">{fmtCents(Number(row.maintenance_cents))}</td>
                  <td className="px-4 py-2.5 text-right text-steel-100">{fmtCents(Number(row.other_expense_cents))}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${row.net_cents >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {fmtCents(row.net_cents)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-steel-100">
                    {miles > 0 ? `$${(row.net_cents / 100 / miles).toFixed(2)}` : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
