/**
 * weeklyRevenueTrend/monthlyRevenueTrend back the owner dashboard's first two
 * panels (M10) and were 0% covered — nothing pinned the carrier_id scope, the
 * cancelled/deleted-load exclusion, the linehaul+FSC revenue definition, or
 * the zero-filled (not missing) periods a quiet week/month produces.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "../db"
import { weeklyRevenueTrend, monthlyRevenueTrend } from "../reports"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
})

describe("weeklyRevenueTrend", () => {
  it("maps period_start and revenue_cents, defaulting to 8 weeks", async () => {
    queryMock.mockResolvedValue([
      { period_start: "2026-06-01", revenue_cents: "0" },
      { period_start: "2026-06-08", revenue_cents: "184500" },
    ])

    const result = await weeklyRevenueTrend(CARRIER)

    expect(result).toEqual([
      { periodStart: "2026-06-01", revenueCents: 0 },
      { periodStart: "2026-06-08", revenueCents: 184500 },
    ])
    const [sql, params] = queryMock.mock.calls[0]
    expect(params).toEqual([CARRIER, "week", 8])
    expect(String(sql)).toContain("l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled'")
    expect(String(sql)).toContain("l.linehaul_cents + l.fuel_surcharge_cents")
  })

  it("passes through a custom week count", async () => {
    await weeklyRevenueTrend(CARRIER, 12)
    const [, params] = queryMock.mock.calls[0]
    expect(params).toEqual([CARRIER, "week", 12])
  })
})

describe("monthlyRevenueTrend", () => {
  it("buckets by month and defaults to 6 months", async () => {
    await monthlyRevenueTrend(CARRIER)
    const [, params] = queryMock.mock.calls[0]
    expect(params).toEqual([CARRIER, "month", 6])
  })

  it("zero-fills a period with no revenue rather than dropping it (LEFT JOIN + COALESCE)", async () => {
    queryMock.mockResolvedValue([{ period_start: "2026-07-01", revenue_cents: "0" }])

    const result = await monthlyRevenueTrend(CARRIER, 1)

    expect(result).toEqual([{ periodStart: "2026-07-01", revenueCents: 0 }])
  })
})
