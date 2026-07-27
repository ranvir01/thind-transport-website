/**
 * src/app/api/hub/ifta/[quarter]/[file]/route.ts had zero test coverage —
 * the only surface where a carrier downloads its IFTA worksheet/source data.
 * Covers the permission gate, quarter validation, the three file variants,
 * and the 404s when a variant has no report to serve.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { computeIfta } from "@/lib/hub/ifta-core"

vi.mock("@/lib/hub/session", () => ({ getHubUser: vi.fn() }))
vi.mock("@/lib/hub/permissions", () => ({ can: vi.fn() }))
vi.mock("@/lib/hub/ifta", () => ({ getIftaReport: vi.fn(), exportIftaSources: vi.fn(), listIftaRates: vi.fn() }))
vi.mock("@/lib/hub/settings", () => ({ getCarrier: vi.fn(), getCarrierSettings: vi.fn() }))
vi.mock("@/lib/hub/pdf", () => ({ buildIftaPdf: vi.fn(async () => Buffer.from("pdf-bytes")) }))
vi.mock("@/lib/hub/ifta-pdf", () => ({ withIftaWarningsCoverPage: vi.fn(async (bytes: Uint8Array) => bytes) }))

import { getHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { getIftaReport, exportIftaSources, listIftaRates } from "@/lib/hub/ifta"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { buildIftaPdf } from "@/lib/hub/pdf"
import { withIftaWarningsCoverPage } from "@/lib/hub/ifta-pdf"
import { GET } from "@/app/api/hub/ifta/[quarter]/[file]/route"

const getHubUserMock = vi.mocked(getHubUser)
const canMock = vi.mocked(can)
const getIftaReportMock = vi.mocked(getIftaReport)
const exportIftaSourcesMock = vi.mocked(exportIftaSources)
const listIftaRatesMock = vi.mocked(listIftaRates)
const getCarrierMock = vi.mocked(getCarrier)
const getCarrierSettingsMock = vi.mocked(getCarrierSettings)
const withIftaWarningsCoverPageMock = vi.mocked(withIftaWarningsCoverPage)

const user = { id: "u1", carrierId: "carrier-1", role: "owner" as const }

function call(quarter: string, file: string) {
  return GET(new Request("http://test/api/hub/ifta"), {
    params: Promise.resolve({ quarter, file }),
  })
}

beforeEach(() => {
  getHubUserMock.mockReset().mockResolvedValue(user)
  canMock.mockReset().mockReturnValue(true)
  getIftaReportMock.mockReset()
  exportIftaSourcesMock.mockReset().mockResolvedValue({ pingsCsv: "unit,timestamp\n", fuelCsv: "unit,timestamp\n" })
  listIftaRatesMock.mockReset().mockResolvedValue([])
  withIftaWarningsCoverPageMock.mockClear()
  getCarrierMock.mockReset().mockResolvedValue({ name: "Thind Transport" } as never)
  getCarrierSettingsMock.mockReset().mockResolvedValue({ branding: { accent: null } } as never)
})

describe("GET /api/hub/ifta/[quarter]/[file]", () => {
  it("403s when unauthenticated", async () => {
    getHubUserMock.mockResolvedValue(null)
    const res = await call("2026Q1", "sources.csv")
    expect(res.status).toBe(403)
  })

  it("403s when the role lacks compliance:read", async () => {
    canMock.mockReturnValue(false)
    const res = await call("2026Q1", "sources.csv")
    expect(res.status).toBe(403)
  })

  it("400s on a malformed quarter", async () => {
    const res = await call("not-a-quarter", "sources.csv")
    expect(res.status).toBe(400)
  })

  it("serves sources.csv scoped to the caller's carrier without requiring a report", async () => {
    const res = await call("2026Q1", "sources.csv")
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/csv")
    expect(res.headers.get("Content-Disposition")).toContain("ifta-2026Q1-sources.csv")
    expect(exportIftaSourcesMock).toHaveBeenCalledWith("carrier-1", "2026Q1")
    const body = await res.text()
    expect(body).toContain("POSITION PINGS")
    expect(body).toContain("FUEL TRANSACTIONS")
  })

  it("404s worksheet.csv when no report has been computed", async () => {
    getIftaReportMock.mockResolvedValue(null)
    const res = await call("2026Q1", "worksheet.csv")
    expect(res.status).toBe(404)
  })

  it("renders worksheet.csv with a TOTAL row from the stored report", async () => {
    getIftaReportMock.mockResolvedValue({
      net_tax_cents: 12345,
      mileage_source: "pings",
      fleet_miles: "1000",
      fleet_gallons: "100",
      mpg: "10",
      report: {
        rows: [
          { jurisdiction: "WA", miles: 1000, taxableGallons: 100, taxPaidGallons: 80, rate: 0.375, surchargeRate: 0, taxCents: 12345, surchargeCents: 0, netCents: 12345 },
        ],
      },
    } as never)
    const res = await call("2026Q1", "worksheet.csv")
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("WA,1000,100.000,80.000,0.3750,123.45,0.0000,0.00,123.45")
    // TOTAL row sums every column the on-screen worksheet <tfoot> does — miles,
    // taxable/tax-paid gallons, base fuel tax, surcharge, net — leaving only the
    // (meaningless-to-sum) rate columns blank.
    expect(body).toContain("TOTAL,1000,100.000,80.000,,123.45,,0.00,123.45")
  })

  it("renders multi-jurisdiction worksheet.csv including surcharge state (golden fixture)", async () => {
    const golden = computeIfta({
      milesByJurisdiction: { WA: 4000, ID: 1000, IN: 2000 },
      gallonsByJurisdiction: { WA: 600, ID: 100, IN: 300 },
      rates: {
        WA: { rate: 0.494 },
        ID: { rate: 0.33 },
        IN: { rate: 0.55, surchargeRate: 0.11 },
      },
    })
    getIftaReportMock.mockResolvedValue({
      net_tax_cents: golden.netTaxCents,
      mileage_source: "pings",
      fleet_miles: String(golden.fleetMiles),
      fleet_gallons: String(golden.fleetGallons),
      mpg: String(golden.mpg),
      report: { rows: golden.rows },
    } as never)
    const res = await call("2026Q1", "worksheet.csv")
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("jurisdiction,miles,taxable_gallons,tax_paid_gallons,rate,fuel_tax_usd,surcharge_rate,surcharge_usd,net_tax_usd")
    expect(body).toContain("ID,1000,142.857,100.000,0.3300,14.14,0.0000,0.00,14.14")
    // Surcharge state: base fuel tax (-7.86, credited) and surcharge (31.43, no
    // credit) are their own columns so each fills the matching IFTA-return line.
    expect(body).toContain("IN,2000,285.714,300.000,0.5500,-7.86,0.1100,31.43,23.57")
    expect(body).toContain("WA,4000,571.429,600.000,0.4940,-14.11,0.0000,0.00,-14.11")
    // Column totals reconcile to the per-line values: base fuel tax -7.83
    // (-14.11+14.14-7.86), surcharge 31.43 (IN only), net 23.60 == net_tax_cents.
    expect(body).toContain("TOTAL,7000,1000.000,1000.000,,-7.83,,31.43,23.60")
  })

  it("falls back to the combined net for legacy rows missing the tax/surcharge split", async () => {
    // Reports computed before taxCents/surchargeCents were persisted only carry
    // netCents — the export must still render, attributing net to fuel tax.
    getIftaReportMock.mockResolvedValue({
      net_tax_cents: 5000,
      mileage_source: "pings",
      fleet_miles: "1000",
      fleet_gallons: "100",
      mpg: "10",
      report: {
        rows: [
          { jurisdiction: "WA", miles: 1000, taxableGallons: 100, taxPaidGallons: 50, rate: 1.0, surchargeRate: 0, netCents: 5000 },
        ],
      },
    } as never)
    const res = await call("2026Q1", "worksheet.csv")
    const body = await res.text()
    expect(body).toContain("WA,1000,100.000,50.000,1.0000,50.00,0.0000,0.00,50.00")
  })

  it("emits 0.0000 (not NaN) in worksheet.csv for legacy rows with no surchargeRate key", async () => {
    // The oldest stored reports predate the surcharge split and omit
    // surchargeRate entirely (not 0 — absent). An unguarded Number(undefined)
    // would print the literal "NaN" into the surcharge_rate column, corrupting
    // any transcription or re-import of the download.
    getIftaReportMock.mockResolvedValue({
      net_tax_cents: 5000,
      mileage_source: "pings",
      fleet_miles: "1000",
      fleet_gallons: "100",
      mpg: "10",
      report: {
        rows: [
          { jurisdiction: "WA", miles: 1000, taxableGallons: 100, taxPaidGallons: 50, rate: 1.0, netCents: 5000 },
        ],
      },
    } as never)
    const res = await call("2026Q1", "worksheet.csv")
    const body = await res.text()
    expect(body).not.toContain("NaN")
    expect(body).toContain("WA,1000,100.000,50.000,1.0000,50.00,0.0000,0.00,50.00")
  })

  it("prepends worksheet warnings as # WARNING lines in worksheet.csv", async () => {
    getIftaReportMock.mockResolvedValue({
      status: "draft",
      net_tax_cents: 0,
      mileage_source: "pings",
      fleet_miles: "1000",
      fleet_gallons: "100",
      mpg: "10",
      report: {
        rows: [
          { jurisdiction: "WA", miles: 1000, taxableGallons: 100, taxPaidGallons: 80, rate: 0.494, surchargeRate: 0, netCents: 0 },
        ],
        missingRates: ["AZ", "NV"],
        unknownJurisdictionGallons: 250,
      },
    } as never)
    // WA rate on file changed after compute → stale warning too.
    listIftaRatesMock.mockResolvedValue([{ jurisdiction: "WA", rate: "0.4990", surcharge_rate: "0" }])
    const res = await call("2026Q1", "worksheet.csv")
    const body = await res.text()
    const lines = body.split("\n")
    expect(lines[0]).toContain("# WARNING: Missing rates for AZ, NV")
    expect(lines[1]).toContain("# WARNING: Rates on file for WA changed")
    expect(lines[2]).toContain("# WARNING: 250 gal of tractor fuel have no state")
    expect(lines[3]).toBe("jurisdiction,miles,taxable_gallons,tax_paid_gallons,rate,fuel_tax_usd,surcharge_rate,surcharge_usd,net_tax_usd")
  })

  it("keeps worksheet.csv warning-free when the report is clean", async () => {
    getIftaReportMock.mockResolvedValue({
      status: "filed",
      net_tax_cents: 12345,
      mileage_source: "pings",
      fleet_miles: "1000",
      fleet_gallons: "100",
      mpg: "10",
      report: {
        rows: [
          { jurisdiction: "WA", miles: 1000, taxableGallons: 100, taxPaidGallons: 80, rate: 0.494, surchargeRate: 0, netCents: 12345 },
        ],
      },
    } as never)
    const res = await call("2026Q1", "worksheet.csv")
    const body = await res.text()
    expect(body).not.toContain("# WARNING")
    expect(body.split("\n")[0]).toBe("jurisdiction,miles,taxable_gallons,tax_paid_gallons,rate,fuel_tax_usd,surcharge_rate,surcharge_usd,net_tax_usd")
  })

  it("404s worksheet.pdf when no report has been computed", async () => {
    getIftaReportMock.mockResolvedValue(null)
    const res = await call("2026Q1", "worksheet.pdf")
    expect(res.status).toBe(404)
  })

  it("builds worksheet.pdf from the caller's carrier profile and stored report", async () => {
    getIftaReportMock.mockResolvedValue({
      net_tax_cents: 500,
      mileage_source: "import",
      fleet_miles: "500",
      fleet_gallons: "50",
      mpg: "10",
      report: { rows: [] },
    } as never)
    const res = await call("2026Q1", "worksheet.pdf")
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(getCarrierMock).toHaveBeenCalledWith("carrier-1")
    expect(getCarrierSettingsMock).toHaveBeenCalledWith("carrier-1")
  })

  it("maps a legacy row's missing surchargeRate to 0 (not NaN) for the PDF", async () => {
    vi.mocked(buildIftaPdf).mockClear()
    getIftaReportMock.mockResolvedValue({
      net_tax_cents: 5000,
      mileage_source: "pings",
      fleet_miles: "1000",
      fleet_gallons: "100",
      mpg: "10",
      report: {
        rows: [
          { jurisdiction: "WA", miles: 1000, taxableGallons: 100, taxPaidGallons: 50, rate: 1.0, netCents: 5000 },
        ],
      },
    } as never)
    const res = await call("2026Q1", "worksheet.pdf")
    expect(res.status).toBe(200)
    const [arg] = vi.mocked(buildIftaPdf).mock.calls[0]
    expect(arg.rows[0].surchargeRate).toBe(0)
    expect(Number.isNaN(arg.rows[0].surchargeRate)).toBe(false)
  })

  it("routes worksheet warnings into the PDF cover-page step", async () => {
    getIftaReportMock.mockResolvedValue({
      status: "reviewed",
      net_tax_cents: 500,
      mileage_source: "import",
      fleet_miles: "500",
      fleet_gallons: "50",
      mpg: "10",
      report: { rows: [], missingRates: ["MT"] },
    } as never)
    const res = await call("2026Q1", "worksheet.pdf")
    expect(res.status).toBe(200)
    expect(withIftaWarningsCoverPageMock).toHaveBeenCalledTimes(1)
    const [, arg] = withIftaWarningsCoverPageMock.mock.calls[0]
    expect(arg.quarter).toBe("2026Q1")
    expect(arg.warnings).toHaveLength(1)
    expect(arg.warnings[0]).toContain("Missing rates for MT")
  })

  it("404s an unrecognized file variant", async () => {
    getIftaReportMock.mockResolvedValue({
      net_tax_cents: 0, mileage_source: "pings", fleet_miles: "0", fleet_gallons: "0", mpg: "0",
      report: { rows: [] },
    } as never)
    const res = await call("2026Q1", "worksheet.xlsx")
    expect(res.status).toBe(404)
  })
})
