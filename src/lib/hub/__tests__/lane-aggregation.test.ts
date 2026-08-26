/**
 * `aggregateLanes` (lanes.ts) is the single SQL aggregation shared by
 * `recomputeLanes` (all-time cache) and the Reports lane leaderboard
 * (`laneLeaderboardRange`, reports.ts) — same revenue/margin formula,
 * different date scope. This guards that both callers still wire the right
 * date filter and params through the shared query, and that sorting/
 * limiting the live leaderboard view in JS matches what the old per-function
 * SQL `ORDER BY ... LIMIT` used to do.
 *
 * It also pins the two things the lane math got wrong: deadhead miles were
 * never costed (so the tool built to kill deadhead couldn't see it), and
 * `lanesOutOf` ranked backhaul hints by TOTAL margin, which recommends long
 * cheap lanes over short rich ones.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "../db"
import { aggregateLanes, avgRpmCents, lanesOutOf, recomputeLanes } from "../lanes"
import { laneLeaderboardRange } from "../reports"
import { DEFAULT_SETTINGS } from "../settings"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

function laneRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    origin_city: "Kent", origin_state: "WA", dest_city: "Portland", dest_state: "OR",
    loads_count: "3", revenue_cents: "300000", miles: "600", deadhead_miles: "120",
    deadhead_missing_loads: 0,
    margin_cents: "166800",
    last_used_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([])
  // No stored settings, so DEFAULT_SETTINGS.costPerMileCents flows through.
  // Referenced, not repeated: this assertion is about the default reaching
  // the query, not about what the default happens to be today.
  queryOneMock.mockReset().mockResolvedValue(null)
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
  it("pins stop laterals to the load's carrier (both-sides tenancy)", async () => {
    await aggregateLanes(CARRIER, 185)
    const [sql] = queryMock.mock.calls[0]
    expect(sql).toContain("FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'pickup'")
    expect(sql).toContain("FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'delivery'")
  })

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

  it("charges cost/mile against loaded AND deadhead miles, not loaded alone", async () => {
    await aggregateLanes(CARRIER, 185)
    const [sql] = queryMock.mock.calls[0]
    expect(sql).toContain(
      "(SUM(COALESCE(l.loaded_miles, 0)) + SUM(COALESCE(l.deadhead_miles, 0))) * $2::int AS margin_cents"
    )
  })

  it("aggregates deadhead miles per lane so the empty miles are visible, not just subtracted", async () => {
    await aggregateLanes(CARRIER, 185)
    const [sql] = queryMock.mock.calls[0]
    expect(sql).toContain("SUM(COALESCE(l.deadhead_miles, 0)) AS deadhead_miles")
  })

  it("counts loads that left deadhead blank, so a blank can't pass as zero empty miles", async () => {
    await aggregateLanes(CARRIER, 185)
    const [sql] = queryMock.mock.calls[0]
    expect(sql).toContain("COUNT(*) FILTER (WHERE l.deadhead_miles IS NULL)::int AS deadhead_missing_loads")
  })

  it("maps numeric-string columns to numbers", async () => {
    queryMock.mockResolvedValue([laneRow({ deadhead_missing_loads: 2 })])
    const [row] = await aggregateLanes(CARRIER, 185)
    expect(row).toEqual({
      origin_city: "Kent", origin_state: "WA", dest_city: "Portland", dest_state: "OR",
      loads_count: 3, revenue_cents: 300000, miles: 600, deadhead_miles: 120,
      deadhead_missing_loads: 2, margin_cents: 166800,
      last_used_at: "2026-07-01T00:00:00.000Z",
    })
  })

  it("defaults the blank count to 0 rather than NaN when the column is absent", async () => {
    queryMock.mockResolvedValue([laneRow({ deadhead_missing_loads: undefined })])
    const [row] = await aggregateLanes(CARRIER, 185)
    expect(row.deadhead_missing_loads).toBe(0)
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

    // hub.lanes has no deadhead column (migrating it is a separate change), so
    // the cache keeps storing loaded miles — the deadhead cost is already
    // netted out of margin_cents by the aggregation above.
    const insert = queryMock.mock.calls.find(([sql]) => /INSERT INTO hub\.lanes/.test(sql))
    expect(insert?.[1]).toEqual([
      CARRIER, "Kent", "WA", "Portland", "OR",
      3, 300000, 600, 166800, /* avg_rpm_cents */ 500, "2026-07-01T00:00:00.000Z",
    ])
  })
})

describe("lanesOutOf", () => {
  it("ranks backhaul hints by margin PER MILE, not total margin", async () => {
    await lanesOutOf(CARRIER, "WA", 3)
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("margin_cents::numeric / NULLIF(miles, 0) DESC NULLS LAST")
    // Total margin survives only as a tiebreaker for lanes with no miles.
    expect(sql.indexOf("margin_cents::numeric / NULLIF(miles, 0)")).toBeLessThan(
      sql.indexOf("margin_cents DESC, loads_count DESC")
    )
    expect(params).toEqual([CARRIER, "WA", 3])
  })

  it("stays carrier-scoped and origin-state-scoped", async () => {
    await lanesOutOf(CARRIER, "OR")
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("WHERE carrier_id = $1 AND origin_state = $2")
    expect(params).toEqual([CARRIER, "OR", 5])
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
    expect(params).toEqual([CARRIER, "2026-01-01", "2026-03-31", DEFAULT_SETTINGS.costPerMileCents])
  })

  it("computes avg_rpm_cents per row instead of trusting SQL ordering alone", async () => {
    queryMock.mockResolvedValue([laneRow({ revenue_cents: "120000", miles: "400" })])
    const [row] = await laneLeaderboardRange(CARRIER, { from: "2026-01-01", to: "2026-01-31" }, 5)
    expect(row.avg_rpm_cents).toBe(300)
  })

  it("carries deadhead miles through to the leaderboard so the screen can show them", async () => {
    queryMock.mockResolvedValue([laneRow({ deadhead_miles: "240" })])
    const [row] = await laneLeaderboardRange(CARRIER, { from: "2026-01-01", to: "2026-01-31" }, 5)
    expect(row.deadhead_miles).toBe(240)
  })

  it("carries the blank-deadhead count through so 0 empty miles isn't rendered as a fact", async () => {
    // A lane whose loads all left the field blank sums to 0 deadhead. The
    // screen needs the count to mark those miles as a floor (≥ 0 mi).
    queryMock.mockResolvedValue([laneRow({ deadhead_miles: "0", deadhead_missing_loads: 3 })])
    const [row] = await laneLeaderboardRange(CARRIER, { from: "2026-01-01", to: "2026-01-31" }, 5)
    expect(row.deadhead_miles).toBe(0)
    expect(row.deadhead_missing_loads).toBe(3)
  })
})
