import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Download } from "lucide-react"
import {
  parseStoredPnlRange, pnlPresetRanges, resolvePnlRange, truckPnlRange, laneLeaderboardRange,
  driverPayCentsForRange, REPORTS_RANGE_COOKIE,
} from "@/lib/hub/reports"
import { applyReportRangeAction, resetReportRangeAction } from "./actions"
import { computeFleetKpis } from "@/lib/hub/kpi"
import { getDeadheadReport } from "@/lib/hub/deadhead"
import { HelpTip } from "@/components/hub/HelpTip"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader, fieldCls } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

// API download endpoints (not pages) — held in consts so the page-link lint rule doesn't misfire.
const PNL_EXPORT_URL = "/api/hub/exports/pnl"
const PNL_RANGE_EXPORT_URL = "/hub/reports/export"
const LANES_RANGE_EXPORT_URL = "/hub/reports/export/lanes"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const user = await requirePermissionPage("money:read")
  const params = await searchParams
  if (!params.from && !params.to) {
    // Reopen where the owner left off: a remembered range redirects to its
    // canonical ?from/?to URL so every range-aware piece keys off params.
    const stored = parseStoredPnlRange((await cookies()).get(REPORTS_RANGE_COOKIE)?.value)
    if (stored) redirect(`/hub/reports?from=${stored.from}&to=${stored.to}`)
  }
  const range = resolvePnlRange(params.from, params.to)
  const [pnl, lanes, driverPayCents, deadhead] = await Promise.all([
    truckPnlRange(user.carrierId, range),
    laneLeaderboardRange(user.carrierId, range, 20),
    driverPayCentsForRange(user.carrierId, range),
    getDeadheadReport(user.carrierId, range),
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
  // Loads that never had deadhead filled in. SUM() skips NULLs, so without this
  // count a book of blank fields reads as a flawless 0% deadhead.
  const deadheadBlankLoads = pnl.reduce((s, r) => s + Number(r.deadhead_missing_loads ?? 0), 0)
  const kpis = computeFleetKpis({
    revenueCents: totals.revenue,
    operatingCostCents: totals.fuel + totals.maintenance + totals.other,
    driverPayCents,
    loadedMiles,
    deadheadMiles,
  })
  const perMile = (c: number | null) => (c == null ? "—" : `$${(c / 100).toFixed(2)}`)
  const pct = (p: number | null) => (p == null ? "—" : `${p}%`)

  // Driver pay is ~44% of a carrier's cost per mile. With settlements in the
  // range we can show a real operating ratio and net margin; without them we
  // show the partial figures under names that admit it, in neutral ink — a
  // margin that ignores payroll is not good news and must not be inked as if
  // it were.
  const hasDriverPay = kpis.driverPayCents != null
  const operatingRatio = hasDriverPay ? kpis.operatingRatioPct : kpis.operatingRatioBeforeDriverPayPct
  const margin = hasDriverPay ? kpis.marginPct : kpis.marginBeforeDriverPayPct
  const deadheadValue =
    kpis.deadheadPct == null ? "—" : deadheadBlankLoads > 0 ? `≥ ${kpis.deadheadPct}%` : `${kpis.deadheadPct}%`

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
  // The lane leaderboard table is always range-scoped (unlike the P&L default
  // above), so its CSV always follows the same range — no separate all-time href.
  const lanesCsvHref = `${LANES_RANGE_EXPORT_URL}?from=${range.from}&to=${range.to}`

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={
          hasDriverPay
            ? `Per-truck P&L, ${rangeLabel}. Fleet ratios include driver settlement pay; the per-truck table below stays operational (fuel, maintenance, expenses). Fixed costs come from the accountant's books.`
            : `Per-truck P&L, ${rangeLabel}. Driver pay and fixed costs come from the accountant's books — this is the operational view.`
        }
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

      <form action={applyReportRangeAction} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex w-40 flex-col gap-1 text-label text-fg-3 uppercase">
          From
          {/* No max={range.to}: it froze the OLD range's end as a hard limit, so moving the
              window forward failed native validation and the submit was silently blocked.
              resolvePnlRange swaps a backwards range server-side anyway. */}
          <input type="date" name="from" defaultValue={range.from} className={fieldCls} />
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
              <button
                key={p.key}
                type="submit"
                name="preset"
                value={p.key}
                className={cn(
                  "rounded-pill px-3 py-1.5 text-xs font-semibold border",
                  active
                    ? "bg-accent-soft text-accent-text border-transparent"
                    : "border-border-strong text-fg-2 hover:bg-hover"
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        {hasCustomRange && (
          <button
            type="submit"
            formAction={resetReportRangeAction}
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-accent-text hover:underline"
          >
            Reset to last 92 days
          </button>
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
          <span className="text-label text-fg-3 uppercase">
            {hasDriverPay ? "Operating ratio" : "Op. ratio, pre-pay"}
          </span>
          <p
            className={`mt-2 font-mono text-xl font-medium tabular-nums ${
              !hasDriverPay ? "text-fg" : operatingRatio != null && operatingRatio < 100 ? "text-ok" : "text-bad"
            }`}
          >
            {pct(operatingRatio)}
          </p>
          <p className="mt-0.5 text-[11px] text-fg-3">
            {hasDriverPay ? "cost incl. driver pay ÷ revenue · <100 = profit" : "excludes driver pay — no settlements in range"}
          </p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Deadhead</span>
          <p className="mt-2 font-mono text-xl font-medium text-fg tabular-nums">{deadheadValue}</p>
          <p className="mt-0.5 text-[11px] text-fg-3">{kpis.totalMiles > 0 ? `${kpis.totalMiles.toLocaleString()} mi total` : "add miles to loads"}</p>
          {deadheadBlankLoads > 0 && (
            <p className="mt-0.5 text-[11px] text-warn">
              {deadheadBlankLoads} load{deadheadBlankLoads === 1 ? "" : "s"} with deadhead blank
            </p>
          )}
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">
            {hasDriverPay ? "Net margin" : "Margin before driver pay"}
          </span>
          <p
            className={`mt-2 font-mono text-xl font-medium tabular-nums ${
              !hasDriverPay ? "text-fg" : margin != null && margin >= 0 ? "text-ok" : "text-bad"
            }`}
          >
            {pct(margin)}
          </p>
          <p className="mt-0.5 text-[11px] text-fg-3">
            {hasDriverPay
              ? `after ${fmtCents(kpis.driverPayCents ?? 0)} driver pay`
              : "not net margin — payroll not counted"}
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Revenue</span><p className="mt-2 font-display text-xl font-extrabold text-accent-text">{fmtCents(totals.revenue)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Fuel</span><p className="mt-2 font-semibold text-xl text-fg">{fmtCents(totals.fuel)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Maintenance</span><p className="mt-2 font-semibold text-xl text-fg">{fmtCents(totals.maintenance)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Other</span><p className="mt-2 font-semibold text-xl text-fg">{fmtCents(totals.other)}</p></Panel>
        <Panel className="p-4"><span className="text-label text-fg-3 uppercase">Net</span><p className={`mt-2 font-display text-xl font-extrabold ${totals.net >= 0 ? "text-ok" : "text-bad"}`}>{fmtCents(totals.net)}</p></Panel>
      </div>

      {/* Deadhead: what dispatch typed vs what the fuel card measured. The two
          numbers disagreeing is the feature, not a bug to reconcile away. */}
      <div className="mb-2 mt-6 flex items-center gap-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-fg">
          Deadhead — typed vs measured
        </h2>
        <HelpTip title="Two numbers on purpose">
          The typed number is whatever dispatch entered on each load — nothing checks it. The
          measured number is fuel-card gallons × your fleet MPG ({deadhead.mpg}) minus the loads&apos;
          loaded miles: miles the trucks actually ran that nobody billed. If the measured number is
          well above the typed one, empty miles are hiding in the book. &quot;Thin&quot; means too
          few fuel rows in this range (or fuel rows are missing) to lean on the estimate.
        </HelpTip>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Typed (dispatch)</span>
          <p className="mt-2 font-mono text-xl font-medium text-fg tabular-nums">
            {deadhead.fleet.typedDeadheadPct == null ? "—" : `${deadhead.fleet.typedDeadheadPct}%`}
          </p>
          <p className="mt-1 text-body-xs text-fg-3">{deadhead.fleet.typedDeadheadMiles.toLocaleString()} mi typed on loads</p>
        </Panel>
        <Panel className="p-4">
          <span className={cn("text-label uppercase", (deadhead.fleet.measuredDeadheadPct ?? 0) > (deadhead.fleet.typedDeadheadPct ?? 0) + 3 ? "text-warn" : "text-fg-3")}>
            Measured (fuel × MPG)
          </span>
          <p className={cn("mt-2 font-mono text-xl font-medium tabular-nums", (deadhead.fleet.measuredDeadheadPct ?? 0) > (deadhead.fleet.typedDeadheadPct ?? 0) + 3 ? "text-warn" : "text-fg")}>
            {deadhead.fleet.measuredDeadheadPct == null ? "—" : `${deadhead.fleet.measuredDeadheadPct}%`}
          </p>
          <p className="mt-1 text-body-xs text-fg-3">
            {deadhead.fleet.basis === "none"
              ? "no tractor-fuel rows in range"
              : `${deadhead.fleet.measuredEmptyMiles?.toLocaleString()} empty of ${deadhead.fleet.measuredTotalMiles?.toLocaleString()} mi driven`}
          </p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Basis</span>
          <p className="mt-2 font-semibold text-xl text-fg">{deadhead.fleet.basis === "fuel" ? "Fuel card" : "—"}</p>
          <p className="mt-1 text-body-xs text-fg-3">gallons × {deadhead.mpg} MPG (reefer/DEF excluded)</p>
        </Panel>
        <Panel className="p-4">
          <span className={cn("text-label uppercase", deadhead.fleet.confidence === "good" ? "text-fg-3" : "text-warn")}>Confidence</span>
          <p className={cn("mt-2 font-semibold text-xl", deadhead.fleet.confidence === "good" ? "text-ok" : deadhead.fleet.confidence === "thin" ? "text-warn" : "text-fg-3")}>
            {deadhead.fleet.confidence === "none" ? "No data" : deadhead.fleet.confidence === "thin" ? "Thin" : "Good"}
          </p>
          <p className="mt-1 text-body-xs text-fg-3">from fuel-row coverage in this range</p>
        </Panel>
      </div>
      {deadhead.trucks.length > 0 ? (
        <Panel className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-label uppercase text-fg-3">
                <th className="p-3">Truck</th>
                <th className="p-3 text-right">Loaded mi</th>
                <th className="p-3 text-right">Typed deadhead</th>
                <th className="p-3 text-right">Measured deadhead</th>
                <th className="p-3 text-right">Gallons</th>
                <th className="p-3 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {deadhead.trucks.map((t) => (
                <tr key={t.truckId} className="border-b border-border last:border-0">
                  <td className="p-3 font-semibold text-fg">{t.truckUnit}</td>
                  <td className="p-3 text-right font-mono tabular-nums text-fg-2">{t.loadedMiles.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono tabular-nums text-fg-2">
                    {t.estimate.typedDeadheadPct == null ? "—" : `${t.estimate.typedDeadheadPct}%`}
                  </td>
                  <td className={cn("p-3 text-right font-mono tabular-nums", (t.estimate.measuredDeadheadPct ?? 0) > (t.estimate.typedDeadheadPct ?? 0) + 3 ? "text-warn" : "text-fg-2")}>
                    {t.estimate.measuredDeadheadPct == null ? "—" : `${t.estimate.measuredDeadheadPct}%`}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-fg-2">{t.gallons.toLocaleString()}</td>
                  <td className={cn("p-3 text-right text-body-xs", t.estimate.confidence === "good" ? "text-ok" : t.estimate.confidence === "thin" ? "text-warn" : "text-fg-3")}>
                    {t.estimate.confidence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}

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

      {/* Lane leaderboard (Phase 6/M10) — live from load history, scoped to the range above */}
      <div className="mt-6 flex items-center justify-between gap-2 mb-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-fg">
          Lane leaderboard, {rangeLabel}
        </h2>
        <a
          href={lanesCsvHref}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-border-strong px-3 text-body-xs font-semibold text-fg-2 hover:bg-hover"
        >
          <Download className="h-3.5 w-3.5" /> Lanes CSV
        </a>
      </div>
      {lanes.length === 0 ? (
        <Panel className="p-5">
          <p className="text-body-sm text-fg-3">No loads with pickup/delivery cities in this range yet.</p>
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
                <th className="px-4 py-3 text-right">Deadhead</th>
                <th className="px-4 py-3 text-right">Est. margin</th>
              </tr>
            </thead>
            <tbody>
              {lanes.slice(0, 12).map((lane) => (
                <tr
                  key={`${lane.origin_city}-${lane.origin_state}-${lane.dest_city}-${lane.dest_state}`}
                  className="border-b border-border"
                >
                  <td className="px-4 py-2.5 font-semibold text-fg">
                    {lane.origin_city}, {lane.origin_state} → {lane.dest_city}, {lane.dest_state}
                  </td>
                  <td className="px-4 py-2.5 text-right text-fg-2">{lane.loads_count}</td>
                  <td className="px-4 py-2.5 text-right text-accent-text font-semibold">{fmtCents(Number(lane.revenue_cents))}</td>
                  <td className="px-4 py-2.5 text-right text-fg-2">
                    {lane.avg_rpm_cents ? `$${(lane.avg_rpm_cents / 100).toFixed(2)}` : "—"}
                  </td>
                  {/* Deadhead is charged inside Est. margin — shown so a lane can be judged on it.
                      Blank fields are unknown, not zero: mark those miles as a floor (≥) so an
                      unfilled lane can't read as a perfect empty-mile-free run (and note that its
                      margin is charged for the miles we know about only). */}
                  <td
                    className={`px-4 py-2.5 text-right ${
                      lane.deadhead_missing_loads > 0 || lane.deadhead_miles > 0 ? "text-warn" : "text-fg-3"
                    }`}
                    title={
                      lane.deadhead_missing_loads > 0
                        ? `${lane.deadhead_missing_loads} load${lane.deadhead_missing_loads === 1 ? "" : "s"} left deadhead blank — real empty miles are higher, and est. margin does not charge for them`
                        : undefined
                    }
                  >
                    {lane.deadhead_missing_loads > 0 ? "≥ " : ""}
                    {lane.deadhead_miles.toLocaleString()} mi
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
