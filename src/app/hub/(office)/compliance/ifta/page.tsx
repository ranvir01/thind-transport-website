import { Download } from "lucide-react"
import { getIftaReport, listIftaRates } from "@/lib/hub/ifta"
import { quarterKey, iftaDueDate } from "@/lib/hub/ifta-core"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCentsExact, type IftaReportRow } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink, fieldCls } from "@/components/hub/ui"
import { IftaControls, IftaRatesImporter } from "@/components/hub/ComplianceForms"

export const dynamic = "force-dynamic"

function quarterOptions(): string[] {
  const now = new Date()
  const options: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i * 3, 1))
    const key = quarterKey(d)
    if (!options.includes(key)) options.push(key)
  }
  return options
}

export default async function IftaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requirePermissionPage("compliance:read")
  const params = await searchParams
  const quarter = /^\d{4}Q[1-4]$/.test(params.q ?? "") ? params.q! : quarterKey(new Date())
  const [report, rates] = await Promise.all([
    getIftaReport(user.carrierId, quarter),
    listIftaRates(quarter),
  ])
  const rows: IftaReportRow[] = (report?.report?.rows as IftaReportRow[] | undefined) ?? []
  const due = iftaDueDate(quarter)

  return (
    <div>
      <BackLink href="/hub/compliance" label="Compliance" />
      <PageHeader
        title={`IFTA — ${quarter}`}
        subtitle={`Filing due ${due.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. File even at zero or credit; source data retained 4 years.`}
      />

      {/* Quarter picker + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <form method="GET">
          <select name="q" defaultValue={quarter} className={`${fieldCls} w-40`}>
            {quarterOptions().map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <button type="submit" className="ml-2 min-h-[44px] rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
            Go
          </button>
        </form>
        <IftaControls quarter={quarter} status={report?.status ?? null} />
        {report ? (
          <div className="flex gap-2">
            <a href={`/api/hub/ifta/${quarter}/worksheet.pdf`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
              <Download className="h-4 w-4" /> Worksheet PDF
            </a>
            <a href={`/api/hub/ifta/${quarter}/worksheet.csv`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
              CSV
            </a>
            <a href={`/api/hub/ifta/${quarter}/sources.csv`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
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
              <p className={`mt-1 font-display text-lg font-extrabold ${Number(report.net_tax_cents) >= 0 ? "text-warn" : "text-ok"}`}>
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

          <Panel className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-label text-fg-3 uppercase">
                  <th className="px-4 py-3">Jur</th>
                  <th className="px-4 py-3 text-right">Miles</th>
                  <th className="px-4 py-3 text-right">Taxable gal</th>
                  <th className="px-4 py-3 text-right">Tax-paid gal</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Surcharge</th>
                  <th className="px-4 py-3 text-right">Net tax</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.jurisdiction} className="border-b border-border">
                    <td className="px-4 py-2.5 font-bold text-fg">{row.jurisdiction}</td>
                    <td className="px-4 py-2.5 text-right text-fg-2">{row.miles.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-fg-2">{row.taxableGallons.toFixed(3)}</td>
                    <td className="px-4 py-2.5 text-right text-fg-2">{row.taxPaidGallons.toFixed(3)}</td>
                    <td className="px-4 py-2.5 text-right text-fg-2">{Number(row.rate).toFixed(4)}</td>
                    <td className="px-4 py-2.5 text-right text-fg-2">{row.surchargeRate ? Number(row.surchargeRate).toFixed(4) : "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${row.netCents >= 0 ? "text-warn" : "text-ok"}`}>
                      {fmtCentsExact(row.netCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
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
            Compute uses GPS pings when present, or imported jurisdiction miles (TruckX CSV) otherwise — plus fuel purchases by state and the rates below.
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
