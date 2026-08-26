import Link from "next/link"
import { ArrowLeft, Upload } from "lucide-react"

import { listTollTransactions, listUnassignedTolls, tollStatsByTruck } from "@/lib/hub/tolls"
import { listTrucks } from "@/lib/hub/fleet"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCents, fmtCentsExact } from "@/lib/hub/types"
import { Panel, PageHeader, EmptyState } from "@/components/hub/ui"
import { UnassignedTollsPanel } from "@/components/hub/UnassignedTollsPanel"

export const dynamic = "force-dynamic"

export default async function TollsPage() {
  const user = await requirePermissionPage("fuel:read")
  const canWrite = can(user.role, "fuel:write")
  const [byTruck, transactions, unassigned, trucks] = await Promise.all([
    tollStatsByTruck(user.carrierId),
    listTollTransactions(user.carrierId, { limit: 50 }),
    canWrite ? listUnassignedTolls(user.carrierId) : Promise.resolve([]),
    canWrite ? listTrucks(user.carrierId) : Promise.resolve([]),
  ])

  const totalCents = byTruck.reduce((sum, r) => sum + Number(r.total_cents), 0)
  const totalTransactions = byTruck.reduce((sum, r) => sum + r.transactions, 0)
  const unassignedCount = byTruck.find((r) => r.truck_id === null)?.transactions ?? 0

  return (
    <div>
      <Link
        href="/hub/fuel"
        className="mb-2 inline-flex items-center gap-1 text-body-xs font-semibold text-fg-3 hover:text-fg"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Fuel
      </Link>
      <PageHeader
        title="Tolls"
        subtitle="Last 92 days from every transponder statement."
        action={
          <Link
            href="/hub/import?kind=tolls"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover"
          >
            <Upload className="h-4 w-4" /> Import statement
          </Link>
        }
      />

      {transactions.length === 0 ? (
        <EmptyState
          title="No toll data yet"
          hint="Import any transponder program's statement CSV — BestPass, PrePass, a state authority export. Column mapping handles the format."
          action={
            <Link href="/hub/import?kind=tolls" className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover">
              Import toll CSV
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Toll spend</span>
              <p className="mt-2 font-mono text-2xl font-medium text-fg tabular-nums">{fmtCents(totalCents)}</p>
            </Panel>
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Transactions</span>
              <p className="mt-2 font-mono text-2xl font-medium text-fg tabular-nums">{totalTransactions.toLocaleString()}</p>
            </Panel>
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Unmatched</span>
              <p className={`mt-2 font-mono text-2xl font-medium tabular-nums ${unassignedCount > 0 ? "text-warn" : "text-fg"}`}>
                {unassignedCount.toLocaleString()}
              </p>
            </Panel>
          </div>

          <UnassignedTollsPanel transactions={unassigned} trucks={trucks.map((t) => ({ id: t.id, unit_number: t.unit_number }))} />

          <Panel className="overflow-x-auto mb-4">
            <h2 className="text-[13.5px] font-semibold text-fg p-4 pb-2">Per truck</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-label text-fg-3 uppercase">
                  <th className="px-4 py-2">Truck</th>
                  <th className="px-4 py-2 text-right">Transactions</th>
                  <th className="px-4 py-2 text-right">Spend</th>
                </tr>
              </thead>
              <tbody>
                {byTruck.map((row) => (
                  <tr key={row.truck_id ?? "none"} className="border-b border-border">
                    <td className="px-4 py-2 font-semibold text-fg">{row.truck_unit ? `#${row.truck_unit}` : "Unmatched"}</td>
                    <td className="px-4 py-2 text-right text-fg-2">{row.transactions.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-accent-text font-semibold">{fmtCents(Number(row.total_cents))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <h2 className="text-base font-semibold text-fg mb-3">Recent transactions</h2>
          <Panel className="divide-y divide-border">
            {transactions.slice(0, 25).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-fg truncate">
                    {tx.plaza ?? "Toll"}{tx.jurisdiction ? ` · ${tx.jurisdiction}` : ""}
                  </p>
                  <p className="text-body-xs text-fg-3">
                    {new Date(tx.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {tx.truck_unit ? ` · #${tx.truck_unit}` : " · unmatched"}
                  </p>
                </div>
                <span className="font-mono font-medium text-accent-text tabular-nums shrink-0">{fmtCentsExact(tx.amount_cents)}</span>
              </div>
            ))}
          </Panel>
        </>
      )}
    </div>
  )
}
