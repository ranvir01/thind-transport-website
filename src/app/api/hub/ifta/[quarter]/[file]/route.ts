import { NextResponse } from "next/server"
import { getHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { getIftaReport, exportIftaSources } from "@/lib/hub/ifta"
import { getCarrier } from "@/lib/hub/settings"
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

  if (file === "worksheet.csv") {
    const csv = [
      "jurisdiction,miles,taxable_gallons,tax_paid_gallons,rate,surcharge_rate,net_tax_usd",
      ...rows.map((r) =>
        `${r.jurisdiction},${r.miles},${r.taxableGallons.toFixed(3)},${r.taxPaidGallons.toFixed(3)},${Number(r.rate).toFixed(4)},${Number(r.surchargeRate).toFixed(4)},${(r.netCents / 100).toFixed(2)}`
      ),
      `TOTAL,,,,,,${(Number(report.net_tax_cents) / 100).toFixed(2)}`,
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
    const pdf = await buildIftaPdf({
      brand: {
        name: carrier?.name ?? "Carrier", address: carrier?.address, phone: carrier?.phone,
        email: carrier?.email, dot: carrier?.dot_number, mc: carrier?.mc_number,
      },
      quarter,
      mileageSource: report.mileage_source ?? "—",
      fleetMiles: Number(report.fleet_miles ?? 0),
      fleetGallons: Number(report.fleet_gallons ?? 0),
      mpg: Number(report.mpg ?? 0),
      rows: rows.map((r) => ({
        jurisdiction: r.jurisdiction, miles: r.miles, taxableGallons: r.taxableGallons,
        taxPaidGallons: r.taxPaidGallons, rate: Number(r.rate), surchargeRate: Number(r.surchargeRate),
        netCents: r.netCents,
      })),
      netTaxCents: Number(report.net_tax_cents ?? 0),
    })
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="ifta-${quarter}-worksheet.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: "Unknown file" }, { status: 404 })
}
