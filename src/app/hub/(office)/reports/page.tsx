import Link from "next/link"
import { Download } from "lucide-react"
import { pnlPresetRanges, resolvePnlRange, truckPnlRange } from "@/lib/hub/reports"
import { computeFleetKpis } from "@/lib/hub/kpi"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader, fieldCls } from "@/components/hub/ui"
import { cn } from "@/lib/utils"
import { query } from "@/lib/hub/db"
import type { Lane } from "@/lib/hub/types"

export const dynamic = "force-dynamic"

// API download endpoints (not pages) — held in consts so the page-link lint rule doesn't misfire.
const PNL_EXPORT_URL = "/api/hub/exports/pnl"
const PNL_RANGE_EXPORT_URL = "/hub/reports/export"
const LANES_EXPORT_URL = "/api/hub/exports/lanes"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const user = await requirePermissionPage("money:read")
  const params = await searchParams
  const range = resolvePnlRange(params.from, params.to)
  const [pnl, lanes] = await Promise.all([
    truckPnlRange(user.carrierId, range),
    query<Lane>(`SELECT * FROM hub.lanes WHERE carrier_id = $1 ORDER BY margin_cents DESC LIMIT 20`, [user.carrierId]),
  ])
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

  const loadedMiles = pnl.reduce((s, r) => s + Number(r.loaded_miles ?? 0), 0)
  const deadheadMiles = pnl.reduce((s, r) => s + Number(r.deadhead_miles ?? 0), 0)
  const kpis = computeFleetKpis({
    revenueCents: totals.revenue,
    operatingCostCents: totals.fuel + totals.maintenance + totals.other,
    loadedMiles,
    deadheadMiles,
  })
  const perMile = (c: number | null) => (c == null ? "—" : `$${(c / 100).toFixed(2)}`)
  const pct = (p: number | null) => (p == null ? "—" : `${p}%`)

  const hasCustomRange = Boolean(params.from || params.to)
  const presets = pnlPresetRanges()
  const fmtDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const rangeLabel = hasCustomRange ? `${fmtDay(range.from)} – ${fmtDay(range.to)}` : "last 92 days"
  // Default view keeps the original trailing-365-day export; a chosen range
  // downloads exactly the dates on screen.
  const pnlCsvHref = hasCustomRange
    ? `${PNL_RANGE_EXPORT_URL}?from=${range.from}&to=${range.to}`
    : PNL_EXPORT_URL

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`Per-truck P&L, ${rangeLabel}. Driver pay and fixed costs come from the accountant's books — this is the operational view.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/hub/reports/owner"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              Owner dashboard →
            </Link>
            <a
              href={pnlCsvHref}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              <Download className="h-4 w-4" /> P&L CSV
            </a>
          </div>
        }
      />

      <form method="GET" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex w-40 flex-col gap-1 text-label text-fg-3 uppercase">
          From
          <input type="date" name="from" defaultValue={range.from} max={range.to} className={fieldCls} />
        </label>
        <label className="flex w-40 flex-col gap-1 text-label text-fg-3 uppercase">
          To
          <input type="date" name="to" defaultValue={range.to} className={fieldCls} />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
        >
          Apply
        </button>
        <div className="flex min-h-[44px] flex-wrap items-center gap-1.5">
          {presets.map((p) => {
            const active = hasCustomRange && p.range.from === range.from && p.range.to === range.to
            return (
              <Link
                key={p.key}
                href={`/hub/reports?from=${p.range.from}&to=${p.range.to}`}
                className={cn(
                  "rounded-pill px-3 py-1.5 text-xs font-semibold border",
                  active
                    ? "bg-accent-soft text-accent-text border-transparent"
                    : "border-border-strong text-fg-2 hover:bg-hover"
                )}
              >
                {p.label}
              </Link>
            )
          })}
        </div>
        {hasCustomRange && (
          <Link href="/hub/reports" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-accent-text hover:underline">
            Reset to last 92 days
          </Link>
        )}
      </form>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Operating cost / mi</span>
          <p className="mt-2 font-mono text-xl font-medium text-fg tabular-nums">{perMile(kpis.cpmCents)}</p>
          <p className="mt-0.5 text-[11px] text-fg-3">fuel + maint + expenses</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Revenue / loaded mi</span>
          <p className="mt-2 font-mono text-xl font-medium text-fg tabular-nums">{perMile(kpis.rpmCents)}</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Operating ratio</span>
          <p className={`mt-2 font-mono text-xl font-medium tabular-nums ${kpis.operatingRatioPct != null && kpis.operatingRatioPct < 100 ? "text-ok" : "text-bad"}`}>{pct(kpis.operatingRatioPct)}</p>
          <p className="mt-0.5 text-[11px] text-fg-3">cost ÷ revenue · &lt;100 = profit</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Deadhead</span>
          <p className="mt-2 font-mono text-xl font-medium text-fg tabular-nums">{pct(kpis.deadheadPct)}</p>
          <p className="mt-0.5 text-[11px] text-fg-3">{kpis.totalMiles > 0 ? `${kpis.totalMiles.toLocaleString()} mi total` : "add miles to loads"}</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Net margin</span>
          <p className={`mt-2 font-mono text-xl font-medium tabular-nums ${kpis.marginPct != null && kpis.marginPct >= 0 ? "text-ok" : "text-bad"}`}>{pct(kpis.marginPct)}</p>
        </Panel>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Revenue</span><p className="mt-2 font-display text-xl font-extrabold text-accent-text">{fmtCents(totals.revenue)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Fuel</span><p className="mt-2 font-semibold text-xl text-fg">{fmtCents(totals.fuel)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Maintenance</span><p className="mt-2 font-semibold text-xl text-fg">{fmtCents(totals.maintenance)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Other</span><p className="mt-2 font-semibold text-xl text-fg">{fmtCents(totals.other)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Net</span><p className={`mt-2 font-display text-xl font-extrabold ${totals.net >= 0 ? "text-ok" : "text-bad"}`}>{fmtCents(totals.net)}</p></Panel>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-label text-fg-3 uppercase">
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
                <tr key={row.truck_id} className="border-b border-border">
                  <td className="px-4 py-2.5 font-bold text-fg">#{row.unit_number}</td>
                  <td className="px-4 py-2.5 text-right text-accent-text font-semibold">{fmtCents(Number(row.revenue_cents))}</td>
                  <td className="px-4 py-2.5 text-right text-fg-2">{fmtCents(Number(row.fuel_cents))}</td>
                  <td className="px-4 py-2.5 text-right text-fg-2">{fmtCents(Number(row.maintenance_cents))}</td>
                  <td className="px-4 py-2.5 text-right text-fg-2">{fmtCents(Number(row.other_expense_cents))}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${row.net_cents >= 0 ? "text-ok" : "text-bad"}`}>
                    {fmtCents(row.net_cents)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-fg-2">
                    {miles > 0 ? `$${(row.net_cents / 100 / miles).toFixed(2)}` : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>

      {/* Lane leaderboard (Phase 6/M10) */}
      <div className="mt-6 flex items-center justify-between gap-2 mb-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-fg">Lane leaderboard</h2>
        <a
          href={LANES_EXPORT_URL}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-border-strong px-3 text-body-xs font-semibold text-fg-2 hover:bg-hover"
        >
          <Download className="h-3.5 w-3.5" /> Lanes CSV
        </a>
      </div>
      {lanes.length === 0 ? (
        <Panel className="p-5">
          <p className="text-body-sm text-fg-3">
            Lane history builds itself from your loads — it recomputes nightly.
          </p>
        </Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-label text-fg-3 uppercase">
                <th className="px-4 py-3">Lane</th>
                <th className="px-4 py-3 text-right">Loads</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Avg $/mi</th>
                <th className="px-4 py-3 text-right">Est. margin</th>
              </tr>
            </thead>
            <tbody>
              {lanes.slice(0, 12).map((lane) => (
                <tr key={lane.id} className="border-b border-border">
                  <td className="px-4 py-2.5 font-semibold text-fg">
                    {lane.origin_city}, {lane.origin_state} → {lane.dest_city}, {lane.dest_state}
                  </td>
                  <td className="px-4 py-2.5 text-right text-fg-2">{lane.loads_count}</td>
                  <td className="px-4 py-2.5 text-right text-accent-text font-semibold">{fmtCents(Number(lane.revenue_cents))}</td>
                  <td className="px-4 py-2.5 text-right text-fg-2">
                    {lane.avg_rpm_cents ? `$${(lane.avg_rpm_cents / 100).toFixed(2)}` : "—"}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${Number(lane.margin_cents) >= 0 ? "text-ok" : "text-bad"}`}>
                    {fmtCents(Number(lane.margin_cents))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  )
}
