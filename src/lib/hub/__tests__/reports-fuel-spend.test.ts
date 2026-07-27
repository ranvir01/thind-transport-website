/**
 * fuelSpendSummary and exportFuelSpendCsv were 0% covered (TEST_GAPS.md §1
 * "reports.ts" row) — the numbers behind the owner dashboard's Fuel Spend
 * panel and its CSV download. Covers the week/month/avg-price math, the
 * no-gallons-yet null (not zero) case, the "Unassigned" truck fallback, the
 * carrier_id scoping on both queries, and the CSV shape.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "../db"
import { fuelSpendSummary, exportFuelSpendCsv } from "../reports"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockClear()
})

describe("fuelSpendSummary", () => {
  it("computes week/month totals and rounds the average price per gallon", async () => {
    queryOneMock.mockResolvedValue({ week_cents: "45000", month_cents: "182000", month_gallons: "487.3" })
    queryMock.mockResolvedValue([
      { truck_id: "t1", truck_unit: "105", total_cents: "62000", gallons: "165.2" },
    ])

    const result = await fuelSpendSummary(CARRIER)

    expect(result.weekCents).toBe(45000)
    expect(result.monthCents).toBe(182000)
    expect(result.monthGallons).toBe(487.3)
    expect(result.avgPriceCents).toBe(Math.round(182000 / 487.3))
    expect(result.topTrucks).toEqual([{ truck_id: "t1", truck_unit: "105", total_cents: 62000, gallons: 165.2 }])
  })

  it("returns zeros and a null average — not a divide-by-zero — when nothing was fueled this month", async () => {
    queryOneMock.mockResolvedValue(null)
    queryMock.mockResolvedValue([])

    const result = await fuelSpendSummary(CARRIER)

    expect(result).toEqual({
      weekCents: 0,
      monthCents: 0,
      monthGallons: 0,
      avgPriceCents: null,
      topTrucks: [],
    })
  })

  it("scopes both the totals query and the top-trucks query by carrier_id", async () => {
    queryOneMock.mockResolvedValue({ week_cents: "0", month_cents: "0", month_gallons: "0" })
    queryMock.mockResolvedValue([])

    await fuelSpendSummary(CARRIER)

    const [totalsSql, totalsParams] = queryOneMock.mock.calls[0]
    expect(String(totalsSql)).toContain("WHERE carrier_id = $1")
    expect(totalsParams).toEqual([CARRIER])

    const [trucksSql, trucksParams] = queryMock.mock.calls[0]
    expect(String(trucksSql)).toContain("WHERE f.carrier_id = $1")
    expect(trucksParams).toEqual([CARRIER])
  })

  it("keeps an unassigned truck's fuel spend visible instead of dropping the row", async () => {
    queryOneMock.mockResolvedValue({ week_cents: "0", month_cents: "9000", month_gallons: "20" })
    queryMock.mockResolvedValue([{ truck_id: null, truck_unit: null, total_cents: "9000", gallons: "20" }])

    const result = await fuelSpendSummary(CARRIER)

    expect(result.topTrucks).toEqual([{ truck_id: null, truck_unit: null, total_cents: 9000, gallons: 20 }])
  })
})

describe("exportFuelSpendCsv", () => {
  it("scopes by carrier_id and returns the fixed filename", async () => {
    queryMock.mockResolvedValue([])

    const result = await exportFuelSpendCsv(CARRIER)

    expect(result.filename).toBe("fuel-spend.csv")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE f.carrier_id = $1")
    expect(params).toEqual([CARRIER])
  })

  it("renders per-truck monthly rows with the Unassigned fallback", async () => {
    queryMock.mockResolvedValue([
      { month: "2026-07", truck: "105", gallons: "165.2", total_spend: "620.00", avg_per_gal: "3.75" },
      { month: "2026-07", truck: "Unassigned", gallons: "10.0", total_spend: "38.50", avg_per_gal: "3.85" },
    ])

    const result = await exportFuelSpendCsv(CARRIER)
    const lines = result.csv.split("\n")

    expect(lines[0]).toBe("Month,Truck,Gallons,TotalSpend,AvgPerGal")
    expect(lines[1]).toBe("2026-07,105,165.2,620.00,3.75")
    expect(lines[2]).toBe("2026-07,Unassigned,10.0,38.50,3.85")
  })
})
