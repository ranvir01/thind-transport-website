import { NextResponse } from "next/server"
import { getHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { getIftaReport, exportIftaSources, listIftaRates } from "@/lib/hub/ifta"
import { iftaWorksheetWarnings, iftaRowFuelTaxCents } from "@/lib/hub/ifta-core"
import { withIftaWarningsCoverPage } from "@/lib/hub/ifta-pdf"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { buildIftaPdf } from "@/lib/hub/pdf"
import type { IftaReportRow } from "@/lib/hub/types"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ quarter: string; file: string }> }
) {
  const user = await getHubUser()
  if (!user || !can(user.role, "compliance:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { quarter, file } = await params
  if (!/^\d{4}Q[1-4]$/.test(quarter)) {
    return NextResponse.json({ error: "Bad quarter" }, { status: 400 })
  }

  if (file === "sources.csv") {
    const { pingsCsv, fuelCsv } = await exportIftaSources(user.carrierId, quarter)
    const combined = `# IFTA source data ${quarter} — retain 4 years\n\n# POSITION PINGS\n${pingsCsv}\n\n# FUEL TRANSACTIONS\n${fuelCsv}\n`
    return new NextResponse(combined, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ifta-${quarter}-sources.csv"`,
      },
    })
  }

  const report = await getIftaReport(user.carrierId, quarter)
  if (!report) return NextResponse.json({ error: "No report for that quarter" }, { status: 404 })
  const rows = (report.report?.rows as IftaReportRow[] | undefined) ?? []
  // The exports must carry the worksheet screen's warnings — a transcriber
  // working from the download otherwise never sees them.
  const rates = await listIftaRates(user.carrierId, quarter)
  const warnings = iftaWorksheetWarnings({
    status: report.status,
    rows,
    missingRates: report.report?.missingRates,
    unknownJurisdictionGallons: report.report?.unknownJurisdictionGallons,
    ratesOnFile: Object.fromEntries(
      rates.map((r) => [
        r.jurisdiction,
        { rate: Number(r.rate), surchargeRate: Number(r.surcharge_rate) || undefined },
      ])
    ),
  })

  if (file === "worksheet.csv") {
    const csv = [
      // Comment-prefixed like sources.csv, above the header so they open at the top.
      ...warnings.map((w) => `# WARNING: ${w}`),
      // Base fuel tax and surcharge are split out (not just the combined net):
      // IN/KY/VA returns require the surcharge as its own line, and the surcharge
      // gets no tax-paid credit, so a transcriber can't derive it from the net.
      "jurisdiction,miles,taxable_gallons,tax_paid_gallons,rate,fuel_tax_usd,surcharge_rate,surcharge_usd,net_tax_usd",
      ...rows.map((r) => {
        const surchargeCents = Number(r.surchargeCents ?? 0)
        const fuelTaxCents = iftaRowFuelTaxCents(r)
        return `${r.jurisdiction},${r.miles},${r.taxableGallons.toFixed(3)},${r.taxPaidGallons.toFixed(3)},${Number(r.rate).toFixed(4)},${(fuelTaxCents / 100).toFixed(2)},${Number(r.surchargeRate).toFixed(4)},${(surchargeCents / 100).toFixed(2)},${(r.netCents / 100).toFixed(2)}`
      }),
      `TOTAL,,,,,,,,${(Number(report.net_tax_cents) / 100).toFixed(2)}`,
    ].join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ifta-${quarter}-worksheet.csv"`,
      },
    })
  }

  if (file === "worksheet.pdf") {
    const carrier = await getCarrier(user.carrierId)
    const settings = await getCarrierSettings(user.carrierId)
    const pdf = await buildIftaPdf({
      brand: {
        name: carrier?.name ?? "Carrier", address: carrier?.address, phone: carrier?.phone,
        email: carrier?.email, dot: carrier?.dot_number, mc: carrier?.mc_number,
        accent: settings.branding.accent,
      },
      quarter,
      mileageSource: report.mileage_source ?? "—",
      fleetMiles: Number(report.fleet_miles ?? 0),
      fleetGallons: Number(report.fleet_gallons ?? 0),
      mpg: Number(report.mpg ?? 0),
      rows: rows.map((r) => ({
        jurisdiction: r.jurisdiction, miles: r.miles, taxableGallons: r.taxableGallons,
        taxPaidGallons: r.taxPaidGallons, rate: Number(r.rate), surchargeRate: Number(r.surchargeRate),
        taxCents: iftaRowFuelTaxCents(r), surchargeCents: Number(r.surchargeCents ?? 0),
        netCents: r.netCents,
      })),
      netTaxCents: Number(report.net_tax_cents ?? 0),
    })
    const withWarnings = await withIftaWarningsCoverPage(new Uint8Array(pdf), { quarter, warnings })
    return new NextResponse(new Uint8Array(withWarnings), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="ifta-${quarter}-worksheet.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: "Unknown file" }, { status: 404 })
}
