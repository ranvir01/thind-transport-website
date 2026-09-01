/**
 * Insurance renewal packet (research wave 2, prompt-13).
 *
 * The PDF is the part an underwriter prices from, so the tests pin: every
 * collection query is tenant-scoped, the render survives both an empty
 * carrier and a fleet big enough to paginate, and the stored document row
 * is carrier-scoped with the kind the compliance page looks up.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PDFDocument } from "pdf-lib"

const { queryMock, queryOneMock, storeGeneratedPdfMock } = vi.hoisted(() => ({
  queryMock: vi.fn(async (_sql: string, _params?: unknown[]) => [] as unknown[]),
  queryOneMock: vi.fn(async (_sql: string, _params?: unknown[]) => null as unknown),
  storeGeneratedPdfMock: vi.fn(async (_fileName: string, _bytes: Uint8Array) => "/api/hub/files/generated.pdf"),
}))
vi.mock("../db", () => ({ query: queryMock, queryOne: queryOneMock }))
vi.mock("../documents", () => ({ storeGeneratedPdf: storeGeneratedPdfMock }))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({
    id: "carrier-1", name: "Thind Transport", dot_number: "2523064", mc_number: "876103",
    phone: "(206) 765-6300", email: "op@example.test", address: "Kent, WA", status: "active",
  })),
}))

import { buildRenewalPacket, collectRenewalData, renderRenewalPdf, type RenewalData } from "../renewal-packet"

const NOW = new Date("2026-08-08T12:00:00Z")

const emptyData: RenewalData = {
  carrier: { name: "Thind Transport", dot_number: "2523064", mc_number: "876103", phone: null, email: null, address: null },
  generatedOn: "2026-08-08",
  trucks: [], trailers: [], drivers: [], iftaQuarters: [], incidents: [], claims: [],
  dvirs: { total: 0, with_defects: 0, unsafe: 0 },
  maintenance: { records12mo: 0, costCents12mo: 0, schedules: 0 },
}

beforeEach(() => {
  queryMock.mockClear().mockResolvedValue([])
  queryOneMock.mockClear().mockResolvedValue(null)
  storeGeneratedPdfMock.mockClear()
})

describe("collectRenewalData", () => {
  it("scopes every collection query to the carrier", async () => {
    const data = await collectRenewalData("carrier-1", NOW)
    expect(queryMock.mock.calls.length).toBeGreaterThanOrEqual(6)
    for (const call of [...queryMock.mock.calls, ...queryOneMock.mock.calls]) {
      expect(String(call[0])).toContain("carrier_id = $1")
      expect((call[1] as unknown[])[0]).toBe("carrier-1")
    }
    // Missing aggregate rows degrade to zeros, never undefined.
    expect(data.dvirs).toEqual({ total: 0, with_defects: 0, unsafe: 0 })
    expect(data.maintenance).toEqual({ records12mo: 0, costCents12mo: 0, schedules: 0 })
    expect(data.generatedOn).toBe("2026-08-08")
  })

  it("keeps soft-deleted and retired equipment out of the fleet schedule", async () => {
    await collectRenewalData("carrier-1", NOW)
    const truckSql = String(queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.trucks"))![0])
    expect(truckSql).toContain("deleted_at IS NULL")
    expect(truckSql).toContain("status <> 'retired'")
    const driverSql = String(queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.drivers"))![0])
    expect(driverSql).toContain("status = 'active'")
  })
})

describe("renderRenewalPdf", () => {
  it("renders a valid PDF even for a carrier with no records yet", async () => {
    const bytes = await renderRenewalPdf(emptyData)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-")
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
  })

  it("paginates instead of drawing off the bottom of the page", async () => {
    const big: RenewalData = {
      ...emptyData,
      drivers: Array.from({ length: 70 }, (_, i) => ({
        first_name: `Driver${i}`, last_name: `Test${i}`, hire_date: "2024-01-01",
        cdl_number: `WDL${1000 + i}`, cdl_state: "WA", cdl_expiry: "2027-01-01",
        medical_card_expiry: "2026-12-01",
      })),
      trucks: Array.from({ length: 20 }, (_, i) => ({
        unit_number: String(100 + i), year: 2020, make: "Freightliner", model: "Cascadia",
        vin: `1FUJGHDV${String(100000 + i)}`, plate: `WA${i}`, plate_state: "WA",
        ownership: "company", insurance_expiry: "2026-11-01",
      })),
    }
    const doc = await PDFDocument.load(await renderRenewalPdf(big))
    expect(doc.getPageCount()).toBeGreaterThan(1)
  })
})

describe("buildRenewalPacket", () => {
  it("stores the PDF and indexes a carrier-scoped document row", async () => {
    queryMock.mockImplementation(async (sql: string) =>
      String(sql).includes("INSERT INTO hub.documents")
        ? [{ id: "doc-1", url: "/api/hub/files/generated.pdf", file_name: "insurance-renewal-packet-2026-08-08.pdf" }]
        : []
    )
    const doc = await buildRenewalPacket("carrier-1", { id: "u1" }, NOW)
    expect(storeGeneratedPdfMock).toHaveBeenCalledTimes(1)
    expect(String(storeGeneratedPdfMock.mock.calls[0]![0])).toBe("insurance-renewal-packet-2026-08-08.pdf")

    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.documents"))!
    expect(String(insert[0])).toContain("'insurance_renewal'")
    const params = insert[1] as unknown[]
    expect(params[0]).toBe("carrier-1")
    expect(doc.url).toBe("/api/hub/files/generated.pdf")
  })
})
