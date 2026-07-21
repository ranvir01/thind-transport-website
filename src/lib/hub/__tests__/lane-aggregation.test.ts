/**
 * `aggregateLanes` (lanes.ts) is the single SQL aggregation shared by
 * `recomputeLanes` (all-time cache) and the Reports lane leaderboard
 * (`laneLeaderboardRange`, reports.ts) — same revenue/margin formula,
 * different date scope. This guards that both callers still wire the right
 * date filter and params through the shared query, and that sorting/
 * limiting the live leaderboard view in JS matches what the old per-function
 * SQL `ORDER BY ... LIMIT` used to do.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "../db"
import { aggregateLanes, avgRpmCents, recomputeLanes } from "../lanes"
import { laneLeaderboardRange } from "../reports"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

function laneRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    origin_city: "Kent", origin_state: "WA", dest_city: "Portland", dest_state: "OR",
    loads_count: "3", revenue_cents: "300000", miles: "600", margin_cents: "189000",
    last_used_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([])
  queryOneMock.mockReset().mockResolvedValue(null) // no stored settings -> default costPerMileCents 185
})

describe("avgRpmCents", () => {
  it("rounds revenue per loaded mile", () => {
    expect(avgRpmCents(300000, 600)).toBe(500)
  })

  it("returns null instead of dividing by zero", () => {
    expect(avgRpmCents(300000, 0)).toBeNull()
  })
})

describe("aggregateLanes", () => {
  it("carrier-scopes and appends the date filter params after the carrier id", async () => {
    await aggregateLanes(CARRIER, 185, "AND l.created_at >= $2::date AND l.created_at < $3::date + 1", ["2026-01-01", "2026-03-31"])
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled' AND l.created_at >= $2::date AND l.created_at < $3::date + 1")
    // cost-per-mile param index shifts with the number of date-filter params.
    expect(sql).toContain("* $4::int AS margin_cents")
    expect(params).toEqual([CARRIER, "2026-01-01", "2026-03-31", 185])
  })

  it("defaults to no date filter (all-time)", async () => {
    await aggregateLanes(CARRIER, 185)
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled' \n")
    expect(sql).toContain("* $2::int AS margin_cents")
    expect(params).toEqual([CARRIER, 185])
  })

  it("maps numeric-string columns to numbers", async () => {
    queryMock.mockResolvedValue([laneRow()])
    const [row] = await aggregateLanes(CARRIER, 185)
    expect(row).toEqual({
      origin_city: "Kent", origin_state: "WA", dest_city: "Portland", dest_state: "OR",
      loads_count: 3, revenue_cents: 300000, miles: 600, margin_cents: 189000,
      last_used_at: "2026-07-01T00:00:00.000Z",
    })
  })
})

describe("recomputeLanes", () => {
  it("deletes the carrier's cache, then upserts one row per aggregated lane with SQL-computed margin", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (/FROM hub\.loads l/.test(sql)) return [laneRow()] as never
      return [] as never
    })
    const result = await recomputeLanes(CARRIER)
    expect(result).toEqual({ lanes: 1 })

    const del = queryMock.mock.calls.find(([sql]) => /DELETE FROM hub\.lanes/.test(sql))
    expect(del?.[1]).toEqual([CARRIER])

    const insert = queryMock.mock.calls.find(([sql]) => /INSERT INTO hub\.lanes/.test(sql))
    expect(insert?.[1]).toEqual([
      CARRIER, "Kent", "WA", "Portland", "OR",
      3, 300000, 600, 189000, /* avg_rpm_cents */ 500, "2026-07-01T00:00:00.000Z",
    ])
  })
})

describe("laneLeaderboardRange", () => {
  const bestMargin = laneRow({ dest_city: "Boise", margin_cents: "250000", loads_count: "2" })
  const worstMargin = laneRow({ dest_city: "Spokane", margin_cents: "50000", loads_count: "9" })
  const midMargin = laneRow({ dest_city: "Portland", margin_cents: "150000", loads_count: "9" })

  it("sorts by margin desc, loads_count desc as tiebreaker, and scopes by [from, to) respecting the limit", async () => {
    queryMock.mockResolvedValue([worstMargin, bestMargin, midMargin])
    const rows = await laneLeaderboardRange(CARRIER, { from: "2026-01-01", to: "2026-03-31" }, 2)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.dest_city)).toEqual(["Boise", "Portland"])
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("AND l.created_at >= $2::date AND l.created_at < $3::date + 1")
    expect(params).toEqual([CARRIER, "2026-01-01", "2026-03-31", 185])
  })

  it("computes avg_rpm_cents per row instead of trusting SQL ordering alone", async () => {
    queryMock.mockResolvedValue([laneRow({ revenue_cents: "120000", miles: "400" })])
    const [row] = await laneLeaderboardRange(CARRIER, { from: "2026-01-01", to: "2026-01-31" }, 5)
    expect(row.avg_rpm_cents).toBe(300)
  })
})
