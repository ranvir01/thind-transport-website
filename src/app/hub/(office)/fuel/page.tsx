import Link from "next/link"
import { AlertTriangle, Route, Upload } from "lucide-react"
import { fuelStatsByTruck, fuelByProgram, fuelFraudFlags, listFuelTransactions, eiaDieselPriceCents, listUnassignedFuel, assignableLoadsForFuel } from "@/lib/hub/fuel"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCents, fmtCentsExact } from "@/lib/hub/types"
import { Panel, PageHeader, EmptyState } from "@/components/hub/ui"
import { FuelUseBadge } from "@/components/hub/FuelUseBadge"
import { UnassignedFuelPanel } from "@/components/hub/UnassignedFuelPanel"

import { HelpTip } from "@/components/hub/HelpTip"

export const dynamic = "force-dynamic"

export default async function FuelPage() {
  const user = await requirePermissionPage("fuel:read")
  const canWrite = can(user.role, "fuel:write")
  const [byTruck, byProgram, fraudFlags, transactions, eiaCents, unassigned, assignableLoads] = await Promise.all([
    fuelStatsByTruck(user.carrierId),
    fuelByProgram(user.carrierId),
    fuelFraudFlags(user.carrierId),
    listFuelTransactions(user.carrierId, { limit: 50 }),
    eiaDieselPriceCents(),
    canWrite ? listUnassignedFuel(user.carrierId) : Promise.resolve([]),
    canWrite ? assignableLoadsForFuel(user.carrierId) : Promise.resolve([]),
  ])

  const totalCents = byProgram.reduce((sum, p) => sum + Number(p.total_cents), 0)
  const totalGallons = byProgram.reduce((sum, p) => sum + Number(p.gallons), 0)

  return (
    <div>
      <PageHeader
        title="Fuel"
        subtitle="Last 92 days across every card program."
        titleExtra={
          <HelpTip title="Reefer fuel & IFTA">
            Only fuel that moves the truck is IFTA fuel. Reefer (trailer fridge) gallons are
            tax-exempt and excluded from MPG and tax-paid credits — misclassifying them
            quietly changes your quarterly tax. Tap any transaction&apos;s badge to fix its type.
          </HelpTip>
        }
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/hub/fuel/tolls"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border px-4 font-semibold text-sm text-fg hover:bg-hover"
            >
              <Route className="h-4 w-4" /> Tolls
            </Link>
            <Link
              href="/hub/import?kind=fuel"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover"
            >
              <Upload className="h-4 w-4" /> Import statement
            </Link>
          </div>
        }
      />

      {transactions.length === 0 ? (
        <EmptyState
          title="No fuel data yet"
          hint="Import any card program's statement CSV — EFS, Comdata, WEX, anything. Column mapping handles the format."
          action={
            <Link href="/hub/import?kind=fuel" className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover">
              Import fuel CSV
            </Link>
          }
        />
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Fuel spend</span>
              <p className="mt-2 font-mono text-2xl font-medium text-fg tabular-nums">{fmtCents(totalCents)}</p>
            </Panel>
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Gallons</span>
              <p className="mt-2 font-mono text-2xl font-medium text-fg tabular-nums">{Math.round(totalGallons).toLocaleString()}</p>
            </Panel>
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Fleet avg $/gal</span>
              <p className="mt-2 font-mono text-2xl font-medium text-fg tabular-nums">
                {totalGallons > 0 ? fmtCentsExact(Math.round(totalCents / totalGallons)) : "—"}
              </p>
            </Panel>
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">EIA weekly diesel</span>
              <p className="mt-2 font-mono text-2xl font-medium text-fg tabular-nums">
                {eiaCents ? fmtCentsExact(eiaCents) : "—"}
              </p>
              {!eiaCents ? <p className="text-body-xs text-fg-3">Set EIA_API_KEY (free) to compare</p> : null}
            </Panel>
          </div>

          {/* Fraud flags */}
          {fraudFlags.length > 0 ? (
            <Panel className="p-4 mb-4 border-warn">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warn" />
                <h2 className="text-[13.5px] font-semibold text-fg">Flags</h2>
              </div>
              <ul className="space-y-1.5">
                {fraudFlags.slice(0, 6).map((flag, i) => (
                  <li key={i} className="text-body-sm text-warn">
                    <span className="uppercase text-body-xs font-bold">{flag.kind.replace("_", " ")}</span>
                    {flag.truck_unit ? ` · #${flag.truck_unit}` : ""} — {flag.detail}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <UnassignedFuelPanel transactions={unassigned} loads={assignableLoads} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            {/* Per truck */}
            <Panel className="overflow-x-auto">
              <h2 className="text-[13.5px] font-semibold text-fg p-4 pb-2">Per truck</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-label text-fg-3 uppercase">
                    <th className="px-4 py-2">Truck</th>
                    <th className="px-4 py-2 text-right">Gallons</th>
                    <th className="px-4 py-2 text-right">Spend</th>
                    <th className="px-4 py-2 text-right">MPG*</th>
                    <th className="px-4 py-2 text-right">Fuel ¢/mi</th>
                  </tr>
                </thead>
                <tbody>
                  {byTruck.map((row) => {
                    const miles = Number(row.loaded_miles ?? 0)
                    const gallons = Number(row.gallons)
                    const tractorGallons = Number(row.tractor_gallons)
                    return (
                      <tr key={row.truck_id ?? "none"} className="border-b border-border">
                        <td className="px-4 py-2 font-semibold text-fg">{row.truck_unit ? `#${row.truck_unit}` : "Unmatched"}</td>
                        <td className="px-4 py-2 text-right text-fg-2">{Math.round(gallons).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-accent-text font-semibold">{fmtCents(Number(row.total_cents))}</td>
                        <td className="px-4 py-2 text-right text-fg-2">{miles > 0 && tractorGallons > 0 ? (miles / tractorGallons).toFixed(1) : "—"}</td>
                        <td className="px-4 py-2 text-right text-fg-2">{miles > 0 ? (Number(row.total_cents) / miles).toFixed(1) : "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="px-4 py-2 text-body-xs text-fg-3">
                * MPG from loaded miles ÷ road-diesel gallons (reefer fuel never counts toward MPG or IFTA).
              </p>
            </Panel>

            {/* By program */}
            <Panel className="overflow-x-auto">
              <h2 className="text-[13.5px] font-semibold text-fg p-4 pb-2">By card program</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-label text-fg-3 uppercase">
                    <th className="px-4 py-2">Program</th>
                    <th className="px-4 py-2 text-right">Gallons</th>
                    <th className="px-4 py-2 text-right">Spend</th>
                    <th className="px-4 py-2 text-right">Avg $/gal</th>
                  </tr>
                </thead>
                <tbody>
                  {byProgram.map((row, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-2 font-semibold text-fg">{row.card_program ?? "Unknown"}</td>
                      <td className="px-4 py-2 text-right text-fg-2">{Math.round(Number(row.gallons)).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-accent-text font-semibold">{fmtCents(Number(row.total_cents))}</td>
                      <td className="px-4 py-2 text-right text-fg-2">{row.avg_price_cents ? fmtCentsExact(Number(row.avg_price_cents)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          {/* Recent transactions */}
          <h2 className="text-base font-semibold text-fg mb-3">Recent transactions</h2>
          <Panel className="divide-y divide-border">
            {transactions.slice(0, 25).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-fg truncate">
                    {tx.merchant ?? "Fuel stop"}{tx.jurisdiction ? ` · ${tx.jurisdiction}` : ""}
                  </p>
                  <p className="text-body-xs text-fg-3">
                    {new Date(tx.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {tx.truck_unit ? ` · #${tx.truck_unit}` : " · unmatched"}
                    {` · ${Number(tx.gallons).toFixed(1)} gal`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <FuelUseBadge id={tx.id} value={tx.fuel_use} />
                  <span className="font-mono font-medium text-accent-text tabular-nums">{fmtCentsExact(tx.total_cents)}</span>
                </div>
              </div>
            ))}
          </Panel>
        </>
      )}
    </div>
  )
}
