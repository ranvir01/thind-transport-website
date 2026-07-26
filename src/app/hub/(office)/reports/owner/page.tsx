import Link from "next/link"
import { cookies } from "next/headers"
import {
  weeklyRevenueTrend, monthlyRevenueTrend, arAgingTrend, settlementLiability, fuelSpendSummary,
  laneLeaderboardRange, truckPnlRange,
  parseStoredPnlRange, resolvePnlRange, REPORTS_RANGE_COOKIE,
  type RevenuePeriod, type AgingTrendPeriod, type SettlementLiability, type FuelSpendSummary, type LaneLeaderboardRow,
} from "@/lib/hub/reports"
import { computeFleetKpis, rankTruckPerformance } from "@/lib/hub/kpi"
import { complianceEntries, summarize, type ComplianceColor, type ComplianceEntry } from "@/lib/hub/compliance"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader, ExpiryPill, type PillTone } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

const COLOR_TONE: Record<ComplianceColor, PillTone> = {
  red: "bad",
  amber: "warn",
  green: "ok",
}

function RevenueBars({ periods, labelFmt }: { periods: RevenuePeriod[]; labelFmt: (iso: string) => string }) {
  const max = Math.max(1, ...periods.map((p) => p.revenueCents))
  return (
    <div className="flex items-end gap-2 px-4 pb-4 pt-2" style={{ height: 160 }}>
      {periods.map((p) => (
        <div key={p.periodStart} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10.5px] font-medium text-fg-3 tabular-nums">
            {p.revenueCents > 0 ? `$${Math.round(p.revenueCents / 100 / 1000)}k` : ""}
          </span>
          <div
            className="w-full rounded-t-md bg-accent"
            style={{ height: Math.max(2, Math.round((p.revenueCents / max) * 110)) }}
            title={fmtCents(p.revenueCents)}
          />
          <span className="text-[10.5px] text-fg-3">{labelFmt(p.periodStart)}</span>
        </div>
      ))}
    </div>
  )
}

const AGING_SEGMENTS: { key: keyof AgingTrendPeriod; className: string; label: string }[] = [
  { key: "currentCents", className: "bg-surface-2", label: "Current" },
  { key: "bucket1_30Cents", className: "bg-warn-soft", label: "1-30" },
  { key: "bucket31_60Cents", className: "bg-warn", label: "31-60" },
  { key: "bucket61_90Cents", className: "bg-bad-soft", label: "61-90" },
  { key: "bucket90PlusCents", className: "bg-bad", label: "90+" },
]

function AgingTrendBars({ periods }: { periods: AgingTrendPeriod[] }) {
  const max = Math.max(1, ...periods.map((p) => p.totalOpenCents))
  const weekLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <div>
      <div className="flex items-end gap-2 px-4 pb-2 pt-2" style={{ height: 160 }}>
        {periods.map((p) => (
          <div key={p.periodStart} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10.5px] font-medium text-fg-3 tabular-nums">
              {p.totalOpenCents > 0 ? `$${Math.round(p.totalOpenCents / 100 / 1000)}k` : ""}
            </span>
            <div
              className="flex w-full flex-col-reverse overflow-hidden rounded-t-md"
              title={fmtCents(p.totalOpenCents)}
            >
              {AGING_SEGMENTS.map((seg) => {
                const value = p[seg.key] as number
                if (value <= 0) return null
                return (
                  <div
                    key={seg.key}
                    className={seg.className}
                    style={{ height: Math.max(1, Math.round((value / max) * 110)) }}
                  />
                )
              })}
            </div>
            <span className="text-[10.5px] text-fg-3">{weekLabel(p.periodStart)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-4 text-[10.5px] text-fg-3">
        {AGING_SEGMENTS.map((seg) => (
          <span key={seg.key} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-sm ${seg.className}`} /> {seg.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function LaneLeaderboardPanel({ lanes, rangeLabel }: { lanes: LaneLeaderboardRow[]; rangeLabel: string }) {
  if (lanes.length === 0) {
    return (
      <p className="px-4 py-4 text-body-sm text-fg-3">
        No loads {rangeLabel} — lane stats build themselves from your load history.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
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
          {lanes.map((lane) => (
            <tr
              key={`${lane.origin_city}|${lane.origin_state}|${lane.dest_city}|${lane.dest_state}`}
              className="border-b border-border last:border-b-0"
            >
              <td className="max-w-[12rem] truncate px-4 py-2.5 font-semibold text-fg">
                {lane.origin_city}, {lane.origin_state} → {lane.dest_city}, {lane.dest_state}
              </td>
              <td className="px-4 py-2.5 text-right text-fg-2">{lane.loads_count}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-accent-text">{fmtCents(lane.revenue_cents)}</td>
              <td className="px-4 py-2.5 text-right text-fg-2">
                {lane.avg_rpm_cents ? `$${(lane.avg_rpm_cents / 100).toFixed(2)}` : "—"}
              </td>
              <td className={`px-4 py-2.5 text-right font-semibold ${lane.margin_cents >= 0 ? "text-ok" : "text-bad"}`}>
                {fmtCents(lane.margin_cents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LoadedVsDeadheadPanel({ pnl, rangeLabel }: { pnl: Awaited<ReturnType<typeof truckPnlRange>>; rangeLabel: string }) {
  const loadedMiles = pnl.reduce((s, r) => s + Number(r.loaded_miles ?? 0), 0)
  const deadheadMiles = pnl.reduce((s, r) => s + Number(r.deadhead_miles ?? 0), 0)
  // A blank deadhead field is unknown, not zero — SUM() skips NULLs, so a load
  // nobody filled in used to read as a perfect empty-mile-free run. Count the
  // blanks and say so rather than quietly rounding the fleet's favour.
  const deadheadBlankLoads = pnl.reduce((s, r) => s + Number(r.deadhead_missing_loads ?? 0), 0)
  const revenueCents = pnl.reduce((s, r) => s + Number(r.revenue_cents), 0)
  const operatingCostCents = pnl.reduce(
    (s, r) => s + Number(r.fuel_cents) + Number(r.maintenance_cents) + Number(r.other_expense_cents),
    0
  )
  // No driverPayCents: this panel renders miles and per-mile rates only, so the
  // margin/operating-ratio fields stay null by design — nothing here can leak a
  // margin computed without payroll. The Reports page sources driver pay and
  // shows those.
  const kpis = computeFleetKpis({ revenueCents, operatingCostCents, loadedMiles, deadheadMiles })
  const perMile = (c: number | null) => (c == null ? "—" : `$${(c / 100).toFixed(2)}`)
  const loadedPct = kpis.loadedPct
  const deadheadLabel =
    kpis.deadheadPct == null ? "—" : deadheadBlankLoads > 0 ? `≥ ${kpis.deadheadPct}%` : `${kpis.deadheadPct}%`

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <div>
          <span className="text-label text-fg-3 uppercase">Operating cost / mi</span>
          <p className="mt-1 font-mono text-lg font-medium text-fg tabular-nums">{perMile(kpis.cpmCents)}</p>
        </div>
        <div>
          <span className="text-label text-fg-3 uppercase">Revenue / loaded mi</span>
          <p className="mt-1 font-mono text-lg font-medium text-fg tabular-nums">{perMile(kpis.rpmCents)}</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        {kpis.totalMiles > 0 ? (
          <div className="h-3 w-full overflow-hidden rounded-full bg-bad-soft">
            <div className="h-full rounded-full bg-accent" style={{ width: `${loadedPct}%` }} />
          </div>
        ) : (
          <div className="h-3 w-full rounded-full bg-surface-2" />
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-accent" /> Loaded {loadedPct != null ? `${loadedPct}%` : "—"} ({kpis.loadedMiles.toLocaleString()} mi)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-bad-soft" /> Deadhead {deadheadLabel} ({kpis.deadheadMiles.toLocaleString()} mi)
          </span>
        </div>
        {deadheadBlankLoads > 0 && (
          <p className="mt-1.5 text-[11px] text-warn">
            {deadheadBlankLoads} load{deadheadBlankLoads === 1 ? "" : "s"} left deadhead blank — real empty miles are higher.
          </p>
        )}
      </div>

      <p className="px-4 py-4 text-[11px] text-fg-3">
        {rangeLabel}, all trucks. {kpis.totalMiles === 0 ? "Add miles to loads to see this trend." : ""}
      </p>
    </div>
  )
}

function TruckPerformancePanel({ pnl, emptyRangeLabel }: { pnl: Awaited<ReturnType<typeof truckPnlRange>>; emptyRangeLabel: string }) {
  const ranked = rankTruckPerformance(
    pnl.map((r) => ({
      truckId: r.truck_id,
      unitNumber: r.unit_number,
      netCents: r.net_cents,
      loadedMiles: Number(r.loaded_miles ?? 0),
    }))
  ).filter((r) => r.netPerMileCents != null)

  if (ranked.length === 0) {
    return (
      <p className="px-4 py-4 text-body-sm text-fg-3">
        No loaded miles {emptyRangeLabel} — truck ranking needs at least one load with miles logged.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-label text-fg-3 uppercase">
            <th className="px-4 py-3">Truck</th>
            <th className="px-4 py-3 text-right">Net</th>
            <th className="px-4 py-3 text-right">Net / mi</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r) => (
            <tr key={r.truckId} className="border-b border-border last:border-b-0">
              <td className="px-4 py-2.5 font-bold text-fg">#{r.unitNumber}</td>
              <td className={`px-4 py-2.5 text-right font-semibold ${r.netCents >= 0 ? "text-ok" : "text-bad"}`}>
                {fmtCents(r.netCents)}
              </td>
              <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${(r.netPerMileCents ?? 0) >= 0 ? "text-ok" : "text-bad"}`}>
                {r.netPerMileCents != null ? `$${(r.netPerMileCents / 100).toFixed(2)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SettlementLiabilityPanel({ liability }: { liability: SettlementLiability }) {
  return (
    <div className="px-4 py-4">
      <span className="text-label text-fg-3 uppercase">Owed to drivers</span>
      <p className="mt-1 font-display text-2xl font-extrabold text-fg">{fmtCents(liability.totalCents)}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-warn" /> Approved, unpaid {fmtCents(liability.approvedCents)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-surface-2" /> Draft {fmtCents(liability.draftCents)}
        </span>
      </div>
      <p className="mt-3 text-[11px] text-fg-3">
        {liability.totalCents === 0
          ? "No open settlements — run payroll to see draft liabilities here."
          : "Approved settlements are ready to pay; drafts still need review."}
      </p>
      <div className="mt-3">
        <Link href="/hub/money/settlements" className="text-[11px] font-semibold text-accent-text hover:underline">
          View settlements →
        </Link>
      </div>
    </div>
  )
}

function FuelSpendPanel({ fuel }: { fuel: FuelSpendSummary }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <div>
          <span className="text-label text-fg-3 uppercase">Month to date</span>
          <p className="mt-1 font-display text-2xl font-extrabold text-fg">{fmtCents(fuel.monthCents)}</p>
        </div>
        <div>
          <span className="text-label text-fg-3 uppercase">Week to date</span>
          <p className="mt-1 font-display text-2xl font-extrabold text-fg">{fmtCents(fuel.weekCents)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-3 text-[11px] text-fg-3">
        <span>{fuel.monthGallons.toLocaleString(undefined, { maximumFractionDigits: 0 })} gal this month</span>
        <span>{fuel.avgPriceCents != null ? `$${(fuel.avgPriceCents / 100).toFixed(2)}/gal avg` : "—"}</span>
      </div>

      {fuel.topTrucks.length > 0 ? (
        <div className="mt-3 divide-y divide-border border-t border-border">
          {fuel.topTrucks.map((t, i) => (
            <div key={t.truck_id ?? i} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="truncate text-sm font-semibold text-fg">{t.truck_unit ?? "Unassigned"}</span>
              <span className="shrink-0 text-sm text-fg-2 tabular-nums">
                {t.gallons.toLocaleString(undefined, { maximumFractionDigits: 0 })} gal · {fmtCents(t.total_cents)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-body-sm text-fg-3">No fuel receipts this month.</p>
      )}

      <div className="flex items-center gap-4 px-4 pb-4 pt-3">
        <Link href="/hub/fuel" className="text-[11px] font-semibold text-accent-text hover:underline">
          Full fuel log →
        </Link>
        <a href="/api/hub/exports/fuel-spend" download className="text-[11px] font-semibold text-accent-text hover:underline">
          Download CSV
        </a>
      </div>
    </div>
  )
}

function ComplianceRedFlagsPanel({ entries }: { entries: ComplianceEntry[] }) {
  const summary = summarize(entries)
  const worst = entries.filter((e) => e.color !== "green").slice(0, 5)

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 px-4 pt-4">
        <div>
          <span className="text-label text-bad uppercase">Expired</span>
          <p className="mt-1 font-display text-2xl font-extrabold text-bad">{summary.red}</p>
        </div>
        <div>
          <span className="text-label text-warn uppercase">Due 30d</span>
          <p className="mt-1 font-display text-2xl font-extrabold text-warn">{summary.amber}</p>
        </div>
        <div>
          <span className="text-label text-ok uppercase">Clean</span>
          <p className="mt-1 font-display text-2xl font-extrabold text-ok">{summary.green}</p>
        </div>
      </div>

      {worst.length > 0 ? (
        <div className="mt-3 divide-y divide-border border-t border-border">
          {worst.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${entry.color === "red" ? "bg-bad" : "bg-warn"}`}
              />
              <div className="min-w-0 flex-1">
                {entry.manualItemId ? (
                  <p className="truncate text-sm font-semibold text-fg">{entry.kind}</p>
                ) : (
                  <Link href={entry.href} className="block truncate text-sm font-semibold text-fg hover:text-accent-text">
                    {entry.name} — {entry.kind}
                  </Link>
                )}
              </div>
              <ExpiryPill date={entry.due} miles={entry.dueMiles} tone={COLOR_TONE[entry.color]} />
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-body-sm text-fg-3">Nothing expired or due soon — clean wall.</p>
      )}

      <div className="px-4 pb-4 pt-3">
        <Link href="/hub/compliance" className="text-[11px] font-semibold text-accent-text hover:underline">
          Full compliance wall →
        </Link>
      </div>
    </div>
  )
}

export default async function OwnerDashboardPage() {
  const user = await requirePermissionPage("money:read")
  // Lane leaderboard and loaded-vs-deadhead both follow the range the owner
  // last set on the Reports page (same cookie), instead of a fixed
  // trailing-92-day window — so a custom range chosen there stays consistent
  // across all three screens.
  const storedRange = parseStoredPnlRange((await cookies()).get(REPORTS_RANGE_COOKIE)?.value)
  const range = storedRange ?? resolvePnlRange()

  const [weekly, monthly, aging, pnl, lanes, liability, compliance, fuel] = await Promise.all([
    weeklyRevenueTrend(user.carrierId, 8),
    monthlyRevenueTrend(user.carrierId, 6),
    arAgingTrend(user.carrierId, 8),
    truckPnlRange(user.carrierId, range),
    laneLeaderboardRange(user.carrierId, range, 5),
    settlementLiability(user.carrierId),
    complianceEntries(user.carrierId),
    fuelSpendSummary(user.carrierId),
  ])

  const weekLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const monthLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short" })
  const fmtDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const rangeLabel = storedRange ? `${fmtDay(range.from)} – ${fmtDay(range.to)}` : "last 92 days"
  const lanesEmptyLabel = storedRange ? `in ${rangeLabel}` : "in the last 92 days"

  return (
    <div>
      <PageHeader
        title="Owner Dashboard"
        subtitle="Revenue, cost, and lane performance at a glance — the numbers an owner checks first."
        action={
          <Link
            href="/hub/reports"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
          >
            Full P&amp;L &amp; lanes →
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Revenue — last 8 weeks">
          <RevenueBars periods={weekly} labelFmt={weekLabel} />
        </Panel>
        <Panel title="Revenue — last 6 months">
          <RevenueBars periods={monthly} labelFmt={monthLabel} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="AR aging trend — last 8 weeks">
          <AgingTrendBars periods={aging} />
        </Panel>
        <Panel title={`Loaded vs. deadhead — ${rangeLabel}`}>
          <LoadedVsDeadheadPanel pnl={pnl} rangeLabel={rangeLabel} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Driver settlement liability">
          <SettlementLiabilityPanel liability={liability} />
        </Panel>
        <Panel title={`Top lanes by margin — ${rangeLabel}`}>
          <LaneLeaderboardPanel lanes={lanes} rangeLabel={lanesEmptyLabel} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Compliance red flags">
          <ComplianceRedFlagsPanel entries={compliance} />
        </Panel>
        <Panel title="Fuel spend">
          <FuelSpendPanel fuel={fuel} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Panel title={`Truck performance, worst-first — ${rangeLabel}`}>
          <TruckPerformancePanel pnl={pnl} emptyRangeLabel={lanesEmptyLabel} />
        </Panel>
      </div>
    </div>
  )
}
