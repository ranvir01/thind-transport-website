import { Download } from "lucide-react"
import { getIftaReport, listIftaRates, listIftaReports } from "@/lib/hub/ifta"
import { quarterKey, lastCompletedQuarterKey, iftaDueDate, iftaFilingIsLate, staleRateJurisdictions, iftaRowFuelTaxCents, iftaWorksheetTotals } from "@/lib/hub/ifta-core"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCentsExact, type IftaReportRow } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink, fieldCls, Pill } from "@/components/hub/ui"
import { IftaControls, IftaRatesImporter } from "@/components/hub/ComplianceForms"

const STATUS_TONE = { draft: "neutral", reviewed: "info", filed: "ok" } as const
// Most-recent-first (query is ORDER BY quarter DESC); caps the strip so a carrier
// with years of filings doesn't get a wall of pills.
const HISTORY_STRIP_LIMIT = 8

export const dynamic = "force-dynamic"

// The current quarter plus the five before it, newest-first, always including
// `selected` — a history-strip pill can point at a filing older than six
// quarters, and a `selected` with no matching <option> leaves the picker
// showing the newest quarter while the page renders the old one, so "Go"
// silently jumps the user off the filing they were viewing.
function quarterOptions(selected: string): string[] {
  const now = new Date()
  const options: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i * 3, 1))
    const key = quarterKey(d)
    if (!options.includes(key)) options.push(key)
  }
  if (!options.includes(selected)) options.push(selected)
  // Quarter keys sort lexicographically the same as chronologically
  // ("2026Q2" > "2026Q1" > "2025Q4"), so a descending string sort keeps the
  // strip newest-first after splicing an older selected quarter in.
  return options.sort().reverse()
}

export default async function IftaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requirePermissionPage("compliance:read")
  const params = await searchParams
  // Default to the last completed quarter — the filing that is actually due;
  // a days-old in-progress quarter is a misleading landing view.
  const quarter = /^\d{4}Q[1-4]$/.test(params.q ?? "") ? params.q! : lastCompletedQuarterKey(new Date())
  const [report, rates, history] = await Promise.all([
    getIftaReport(user.carrierId, quarter),
    listIftaRates(user.carrierId, quarter),
    listIftaReports(user.carrierId),
  ])
  const rows: IftaReportRow[] = (report?.report?.rows as IftaReportRow[] | undefined) ?? []
  const totals = iftaWorksheetTotals(rows)
  const due = iftaDueDate(quarter)
  // iftaDueDate is UTC midnight of the due DATE; `due < new Date()` shouted
  // "overdue" from the start of the day the filing was due. Same rule as the
  // compliance wall: late only once the due date has fully passed locally.
  const isOverdue = iftaFilingIsLate(quarter, new Date()) && report?.status !== "filed"
  // Rates re-imported after the compute leave the report priced on superseded
  // rates; a filed quarter is history, so only unfiled reports get the nag.
  const staleRates =
    report && report.status !== "filed"
      ? staleRateJurisdictions(
          rows,
          Object.fromEntries(
            rates.map((r) => [
              r.jurisdiction,
              { rate: Number(r.rate), surchargeRate: Number(r.surcharge_rate) || undefined },
            ])
          )
        )
      : []

  return (
    <div>
      <BackLink href="/hub/compliance" label="Compliance" />
      <PageHeader
        title={`IFTA — ${quarter}`}
        subtitle={`Filing due ${due.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. File even at zero or credit; source data retained 4 years.`}
      />

      {isOverdue ? (
        <Panel className="p-4 mb-4 border-bad-soft">
          <p className="text-body-sm text-bad font-semibold">
            Filing overdue — was due {due.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
            {report ? " File with your state's IFTA portal, then mark this quarter filed below." : " Compute the quarter below, file with your state, then mark it filed."}
          </p>
        </Panel>
      ) : null}

      {/* Quarter picker + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <form method="GET" className="flex items-center gap-2">
          <select name="q" aria-label="Filing quarter" defaultValue={quarter} className={`${fieldCls} w-40`}>
            {quarterOptions(quarter).map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <button type="submit" className="min-h-[44px] rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
            Go
          </button>
        </form>
        <IftaControls quarter={quarter} status={report?.status ?? null} />
        {history.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {history.slice(0, HISTORY_STRIP_LIMIT).map((h) => (
              <a key={h.quarter} href={`/hub/compliance/ifta?q=${h.quarter}`}>
                <Pill tone={h.quarter === quarter ? "accent" : STATUS_TONE[h.status]}>
                  {h.quarter} {h.status}
                </Pill>
              </a>
            ))}
          </div>
        ) : null}
        {report ? (
          <div className="flex gap-2">
            <a href={`/api/hub/ifta/${quarter}/worksheet.pdf`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
              <Download className="h-4 w-4" /> Worksheet PDF
            </a>
            <a href={`/api/hub/ifta/${quarter}/worksheet.csv`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
              CSV
            </a>
            <a href={`/api/hub/ifta/${quarter}/sources.csv`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
              4-yr source data
            </a>
          </div>
        ) : null}
      </div>

      {report ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Status</span>
              <p className="mt-1 font-semibold text-lg text-fg uppercase">{report.status}</p>
            </Panel>
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Mileage source</span>
              <p className="mt-1 font-semibold text-lg text-fg uppercase">{report.mileage_source}</p>
            </Panel>
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Fleet miles</span>
              <p className="mt-1 font-semibold text-lg text-fg">{Number(report.fleet_miles).toLocaleString()}</p>
            </Panel>
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Fleet MPG</span>
              <p className="mt-1 font-semibold text-lg text-fg">{Number(report.mpg).toFixed(2)}</p>
            </Panel>
            <Panel className="p-4">
              <span className="text-label text-fg-3 uppercase">Net tax</span>
              <p className={`mt-1 text-lg font-semibold ${Number(report.net_tax_cents) > 0 ? "text-warn" : Number(report.net_tax_cents) < 0 ? "text-ok" : "text-fg"}`}>
                {fmtCentsExact(Number(report.net_tax_cents))}
              </p>
            </Panel>
          </div>

          {(report.report?.missingRates?.length ?? 0) > 0 ? (
            <Panel className="p-4 mb-4 border-warn">
              <p className="text-body-sm text-warn font-semibold">
                Missing rates for: {report.report.missingRates!.join(", ")} — import below and recompute.
              </p>
            </Panel>
          ) : null}

          {staleRates.length > 0 ? (
            <Panel className="p-4 mb-4 border-warn">
              <p className="text-body-sm text-warn font-semibold">
                Rates on file for {staleRates.join(", ")} changed after this report was computed —
                the lines below use the old rates. Recompute before filing (Mark filed is blocked until then).
              </p>
            </Panel>
          ) : null}

          {(report.report?.unknownJurisdictionGallons ?? 0) > 0 ? (
            <Panel className="p-4 mb-4 border-warn">
              <p className="text-body-sm text-warn font-semibold">
                {report.report.unknownJurisdictionGallons!.toLocaleString()}
                {" gal of tractor fuel have no state and are excluded from tax-paid credit and fleet MPG — this overstates MPG and understates taxable gallons. Set each purchase's state in "}
                <a href="/hub/fuel" className="underline">Fuel</a> and recompute.
              </p>
            </Panel>
          ) : null}

          <Panel className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-label text-fg-3 uppercase">
                  <th className="px-4 py-3">Jur</th>
                  <th className="px-4 py-3 text-right">Miles</th>
                  <th className="px-4 py-3 text-right">Taxable gal</th>
                  <th className="px-4 py-3 text-right">Tax-paid gal</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3 text-right">Surch rate</th>
                  <th className="px-4 py-3 text-right">Surch $</th>
                  <th className="px-4 py-3 text-right">Net tax</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const surchargeCents = Number(row.surchargeCents ?? 0)
                  const fuelTaxCents = iftaRowFuelTaxCents(row)
                  return (
                    <tr key={row.jurisdiction} className="border-b border-border">
                      <td className="px-4 py-2.5 font-bold text-fg">{row.jurisdiction}</td>
                      <td className="px-4 py-2.5 text-right text-fg-2">{row.miles.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-fg-2">{row.taxableGallons.toFixed(3)}</td>
                      <td className="px-4 py-2.5 text-right text-fg-2">{row.taxPaidGallons.toFixed(3)}</td>
                      <td className="px-4 py-2.5 text-right text-fg-2">{Number(row.rate).toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-right text-fg-2">{fmtCentsExact(fuelTaxCents)}</td>
                      <td className="px-4 py-2.5 text-right text-fg-2">{row.surchargeRate ? Number(row.surchargeRate).toFixed(4) : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-fg-2">{surchargeCents ? fmtCentsExact(surchargeCents) : "—"}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${row.netCents > 0 ? "text-warn" : row.netCents < 0 ? "text-ok" : "text-fg-2"}`}>
                        {fmtCentsExact(row.netCents)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {rows.length > 0 ? (
                <tfoot>
                  {/* Column totals — a state IFTA return asks for total taxable
                      gallons, tax-paid gallons, and tax as its own summary lines. */}
                  <tr className="border-t-2 border-border-strong font-semibold text-fg">
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-4 py-2.5 text-right">{Math.round(totals.miles).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{totals.taxableGallons.toFixed(3)}</td>
                    <td className="px-4 py-2.5 text-right">{totals.taxPaidGallons.toFixed(3)}</td>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5 text-right">{fmtCentsExact(totals.taxCents)}</td>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5 text-right">{totals.surchargeCents ? fmtCentsExact(totals.surchargeCents) : "—"}</td>
                    <td className={`px-4 py-2.5 text-right ${totals.netCents > 0 ? "text-warn" : totals.netCents < 0 ? "text-ok" : "text-fg-2"}`}>
                      {fmtCentsExact(totals.netCents)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </Panel>
          <p className="text-body-xs text-fg-3 mb-4">
            Taxable gallons = jurisdiction miles ÷ fleet MPG. Net = (taxable − tax-paid) × rate. IN/KY/VA surcharge lines get no tax-paid credit. Ordered for transcription into the WA filing portal.
          </p>
        </>
      ) : (
        <Panel className="p-6 mb-4 text-center">
          <p className="text-fg font-semibold">No report computed for {quarter} yet.</p>
          <p className="text-body-sm text-fg-2 mt-1">
            Compute uses GPS pings for every truck that has them and imported jurisdiction miles (TruckX CSV) for the trucks that don&apos;t — plus fuel purchases by state and the rates below.
          </p>
        </Panel>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <IftaRatesImporter quarter={quarter} />
        <Panel className="p-4">
          <h2 className="text-[13.5px] font-semibold text-fg mb-2">
            Rates on file for {quarter} ({rates.length})
          </h2>
          {rates.length === 0 ? (
            <p className="text-body-sm text-fg-3">None yet — paste from the quarterly iftach.org matrix.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {rates.map((rate) => (
                <span key={rate.jurisdiction} className="rounded-full border border-border-strong bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-fg-2">
                  {rate.jurisdiction} {Number(rate.rate).toFixed(4)}
                  {Number(rate.surcharge_rate) > 0 ? ` +${Number(rate.surcharge_rate).toFixed(4)}` : ""}
                </span>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
