/**
 * src/app/api/hub/ifta/[quarter]/[file]/route.ts had zero test coverage —
 * the only surface where a carrier downloads its IFTA worksheet/source data.
 * Covers the permission gate, quarter validation, the three file variants,
 * and the 404s when a variant has no report to serve.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/session", () => ({ getHubUser: vi.fn() }))
vi.mock("@/lib/hub/permissions", () => ({ can: vi.fn() }))
vi.mock("@/lib/hub/ifta", () => ({ getIftaReport: vi.fn(), exportIftaSources: vi.fn() }))
vi.mock("@/lib/hub/settings", () => ({ getCarrier: vi.fn(), getCarrierSettings: vi.fn() }))
vi.mock("@/lib/hub/pdf", () => ({ buildIftaPdf: vi.fn(async () => Buffer.from("pdf-bytes")) }))

import { getHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { getIftaReport, exportIftaSources } from "@/lib/hub/ifta"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { GET } from "@/app/api/hub/ifta/[quarter]/[file]/route"

const getHubUserMock = vi.mocked(getHubUser)
const canMock = vi.mocked(can)
const getIftaReportMock = vi.mocked(getIftaReport)
const exportIftaSourcesMock = vi.mocked(exportIftaSources)
const getCarrierMock = vi.mocked(getCarrier)
const getCarrierSettingsMock = vi.mocked(getCarrierSettings)

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
          { jurisdiction: "WA", miles: 1000, taxableGallons: 100, taxPaidGallons: 80, rate: 0.375, surchargeRate: 0, netCents: 12345 },
        ],
      },
    } as never)
    const res = await call("2026Q1", "worksheet.csv")
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("WA,1000,100.000,80.000,0.3750,0.0000,123.45")
    expect(body).toContain("TOTAL,,,,,,123.45")
  })

  it("renders multi-jurisdiction worksheet.csv including surcharge state (IN)", async () => {
    // Mirrors ifta.test.ts golden fixture — WA/ID/IN with IN surcharge_rate column populated.
    getIftaReportMock.mockResolvedValue({
      net_tax_cents: 2360,
      mileage_source: "pings",
      fleet_miles: "7000",
      fleet_gallons: "1000",
      mpg: "7",
      report: {
        rows: [
          { jurisdiction: "WA", miles: 4000, taxableGallons: 571.428571, taxPaidGallons: 600, rate: 0.494, surchargeRate: 0, netCents: -1411 },
          { jurisdiction: "ID", miles: 1000, taxableGallons: 142.857143, taxPaidGallons: 100, rate: 0.33, surchargeRate: 0, netCents: 1414 },
          { jurisdiction: "IN", miles: 2000, taxableGallons: 285.714286, taxPaidGallons: 300, rate: 0.55, surchargeRate: 0.11, netCents: 2357 },
        ],
      },
    } as never)
    const res = await call("2026Q1", "worksheet.csv")
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("jurisdiction,miles,taxable_gallons,tax_paid_gallons,rate,surcharge_rate,net_tax_usd")
    expect(body).toContain("WA,4000,571.429,600.000,0.4940,0.0000,-14.11")
    expect(body).toContain("ID,1000,142.857,100.000,0.3300,0.0000,14.14")
    expect(body).toContain("IN,2000,285.714,300.000,0.5500,0.1100,23.57")
    expect(body).toContain("TOTAL,,,,,,23.60")
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

  it("404s an unrecognized file variant", async () => {
    getIftaReportMock.mockResolvedValue({
      net_tax_cents: 0, mileage_source: "pings", fleet_miles: "0", fleet_gallons: "0", mpg: "0",
      report: { rows: [] },
    } as never)
    const res = await call("2026Q1", "worksheet.xlsx")
    expect(res.status).toBe(404)
  })
})
