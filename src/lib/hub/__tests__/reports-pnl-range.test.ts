import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "@/lib/hub/db"
import {
  driverPayCentsForRange, parseStoredPnlRange, pnlPresetRanges, resolvePnlRange, truckPnlRange,
  truckPnlRangeCsv,
} from "@/lib/hub/reports"
import type { TruckPnl } from "@/lib/hub/expenses"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

describe("resolvePnlRange", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("passes through a valid from/to pair unchanged", () => {
    expect(resolvePnlRange("2026-01-01", "2026-03-31")).toEqual({ from: "2026-01-01", to: "2026-03-31" })
  })

  it("defaults to the trailing 92 days ending today when both params are missing", () => {
    expect(resolvePnlRange(undefined, undefined)).toEqual({ from: "2026-04-13", to: "2026-07-14" })
  })

  it("defaults only the missing end when one param is valid", () => {
    expect(resolvePnlRange("2026-06-01", undefined)).toEqual({ from: "2026-06-01", to: "2026-07-14" })
    expect(resolvePnlRange(undefined, "2026-06-01")).toEqual({ from: "2026-04-13", to: "2026-06-01" })
  })

  it("swaps a backwards range instead of erroring", () => {
    expect(resolvePnlRange("2026-06-01", "2026-01-01")).toEqual({ from: "2026-01-01", to: "2026-06-01" })
  })

  it("falls back to the default range for malformed date strings", () => {
    expect(resolvePnlRange("not-a-date", "2026/07/01")).toEqual({ from: "2026-04-13", to: "2026-07-14" })
  })

  it("rejects calendar-impossible dates that Date would otherwise roll over", () => {
    // 2026-02-31 does not exist; naive `new Date()` parsing rolls it to March 3.
    expect(resolvePnlRange("2026-02-31", "2026-07-14")).toEqual({ from: "2026-04-13", to: "2026-07-14" })
  })

  it("accepts a leap-day date", () => {
    expect(resolvePnlRange("2024-02-29", "2026-07-14")).toEqual({ from: "2024-02-29", to: "2026-07-14" })
  })
})

describe("pnlPresetRanges", () => {
  it("computes MTD, last month, last quarter, and YTD for a mid-year date", () => {
    const presets = pnlPresetRanges(new Date("2026-07-14T12:00:00Z"))
    expect(presets).toEqual([
      { key: "mtd", label: "MTD", range: { from: "2026-07-01", to: "2026-07-14" } },
      { key: "last-month", label: "Last month", range: { from: "2026-06-01", to: "2026-06-30" } },
      { key: "last-quarter", label: "Last quarter", range: { from: "2026-04-01", to: "2026-06-30" } },
      { key: "ytd", label: "YTD", range: { from: "2026-01-01", to: "2026-07-14" } },
    ])
  })

  it("rolls last month and last quarter back into the prior year in January", () => {
    const presets = pnlPresetRanges(new Date("2026-01-15T12:00:00Z"))
    const byKey = Object.fromEntries(presets.map((p) => [p.key, p.range]))
    expect(byKey["last-month"]).toEqual({ from: "2025-12-01", to: "2025-12-31" })
    expect(byKey["last-quarter"]).toEqual({ from: "2025-10-01", to: "2025-12-31" })
  })

  it("rolls last quarter back into the prior year for a Q1 date", () => {
    // Q1 2026 (Jan-Mar) -> last complete quarter is Q4 2025 (Oct-Dec).
    const presets = pnlPresetRanges(new Date("2026-02-10T12:00:00Z"))
    const lastQuarter = presets.find((p) => p.key === "last-quarter")
    expect(lastQuarter?.range).toEqual({ from: "2025-10-01", to: "2025-12-31" })
  })
})

describe("parseStoredPnlRange", () => {
  it("returns null for null, undefined, or empty input", () => {
    expect(parseStoredPnlRange(null)).toBeNull()
    expect(parseStoredPnlRange(undefined)).toBeNull()
    expect(parseStoredPnlRange("")).toBeNull()
  })

  it("parses a valid stored range", () => {
    expect(parseStoredPnlRange("2026-01-01_2026-03-31")).toEqual({ from: "2026-01-01", to: "2026-03-31" })
  })

  it("swaps a backwards stored range instead of rejecting it", () => {
    expect(parseStoredPnlRange("2026-06-01_2026-01-01")).toEqual({ from: "2026-01-01", to: "2026-06-01" })
  })

  it("rejects a value with extra underscore-separated parts", () => {
    expect(parseStoredPnlRange("2026-01-01_2026-03-31_extra")).toBeNull()
  })

  it("rejects a value missing the second date", () => {
    expect(parseStoredPnlRange("2026-01-01")).toBeNull()
  })

  it("rejects malformed or calendar-impossible dates", () => {
    expect(parseStoredPnlRange("not-a-date_2026-03-31")).toBeNull()
    expect(parseStoredPnlRange("2026-02-31_2026-03-31")).toBeNull()
    expect(parseStoredPnlRange("garbage")).toBeNull()
  })
})

describe("truckPnlRangeCsv", () => {
  const range = { from: "2026-01-01", to: "2026-03-31" }

  const row = (overrides: Partial<TruckPnl> = {}): TruckPnl => ({
    truck_id: "t1",
    unit_number: "101",
    revenue_cents: "500000",
    fuel_cents: "120000",
    maintenance_cents: "10000",
    toll_cents: "3000",
    other_expense_cents: "5000",
    loaded_miles: "2000",
    deadhead_miles: "150",
    net_cents: 362000,
    ...overrides,
  })

  it("names the file after the range", () => {
    const { filename } = truckPnlRangeCsv([], range)
    expect(filename).toBe("per-truck-pnl_2026-01-01_2026-03-31.csv")
  })

  it("emits a header row plus one row per truck with dollars and net/mile", () => {
    const { csv } = truckPnlRangeCsv([row()], range)
    const [header, dataRow] = csv.split("\n")
    expect(header).toBe("Truck,Revenue,Fuel,Maintenance,Tolls,OtherExpenses,Net,LoadedMiles,NetPerMile")
    expect(dataRow).toBe("101,5000.00,1200.00,100.00,30.00,50.00,3620.00,2000,1.81")
  })

  it("leaves NetPerMile blank instead of dividing by zero when loaded_miles is falsy", () => {
    const { csv } = truckPnlRangeCsv([row({ loaded_miles: null })], range)
    const [, dataRow] = csv.split("\n")
    expect(dataRow.endsWith(",0,")).toBe(true)
  })

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    const { csv } = truckPnlRangeCsv([row({ unit_number: 'Unit, "East"\nFleet' })], range)
    expect(csv).toContain('"Unit, ""East""\nFleet",5000.00,1200.00')
  })

  it("returns just the header for an empty fleet", () => {
    const { csv } = truckPnlRangeCsv([], range)
    expect(csv).toBe("Truck,Revenue,Fuel,Maintenance,Tolls,OtherExpenses,Net,LoadedMiles,NetPerMile")
  })
})

/**
 * Driver pay is ~44% of a carrier's all-in cost per mile (ATRI 2025), and the
 * per-truck P&L doesn't carry a cent of it. `computeFleetKpis` refuses to emit
 * a net margin without it, so this is what has to supply it — and what has to
 * say "I don't know" rather than "zero".
 */
describe("driverPayCentsForRange", () => {
  const range = { from: "2026-01-01", to: "2026-03-31" }

  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue([])
    queryOneMock.mockReset().mockResolvedValue(null)
  })

  it("sums only earning lines, carrier-scoped, over settlement periods ending in the range", async () => {
    queryOneMock.mockResolvedValue({ settlements: 4, earnings_cents: "1234567" })
    expect(await driverPayCentsForRange(CARRIER, range)).toBe(1234567)

    const [sql, params] = queryOneMock.mock.calls[0]
    expect(sql).toContain("FILTER (WHERE sl.kind = 'earning')")
    expect(sql).toContain("WHERE s.carrier_id = $1 AND s.period_end BETWEEN $2::date AND $3::date")
    expect(sql).toContain("LEFT JOIN hub.settlement_lines sl ON sl.settlement_id = s.id")
    expect(params).toEqual([CARRIER, "2026-01-01", "2026-03-31"])
  })

  it("returns null, not 0, when the carrier has no settlements in the range", async () => {
    // 0 would be read as "payroll cost nothing" and paint a green full-cost
    // margin on a book that simply never ran payroll.
    queryOneMock.mockResolvedValue({ settlements: 0, earnings_cents: "0" })
    expect(await driverPayCentsForRange(CARRIER, range)).toBeNull()
  })

  it("returns null when the query yields no row at all", async () => {
    queryOneMock.mockResolvedValue(null)
    expect(await driverPayCentsForRange(CARRIER, range)).toBeNull()
  })

  it("returns 0 when settlements exist but carried no earning lines", async () => {
    queryOneMock.mockResolvedValue({ settlements: 2, earnings_cents: "0" })
    expect(await driverPayCentsForRange(CARRIER, range)).toBe(0)
  })
})

describe("truckPnlRange deadhead blanks", () => {
  const range = { from: "2026-01-01", to: "2026-03-31" }

  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue([])
    queryOneMock.mockReset().mockResolvedValue(null)
  })

  it("counts loads whose deadhead_miles is blank, carrier-guarded on the join side", async () => {
    await truckPnlRange(CARRIER, range)
    const [sql] = queryMock.mock.calls[0]
    expect(sql).toContain("AND l.deadhead_miles IS NULL) AS deadhead_missing_loads")
    // The blank-count subquery carries the same both-sides tenancy guard as the
    // rest of the per-truck P&L.
    expect(sql).toContain("l.truck_id = t.id AND l.carrier_id = t.carrier_id")
  })

  it("scopes toll cost (hub.toll_transactions) to the same [from, to] window as every other bucket", async () => {
    await truckPnlRange(CARRIER, range)
    const [sql] = queryMock.mock.calls[0]
    expect(sql).toContain("FROM hub.toll_transactions x")
    expect(sql).toContain("x.truck_id = t.id AND x.carrier_id = t.carrier_id")
    expect(sql).toContain("x.ts >= $2::date AND x.ts < $3::date + 1")
  })

  it("surfaces the blank count as a number so a NULL sum can't read as a perfect 0% deadhead", async () => {
    queryMock.mockResolvedValue([
      {
        truck_id: "t1", unit_number: "101", revenue_cents: "500000", fuel_cents: "120000",
        maintenance_cents: "10000", toll_cents: "0", other_expense_cents: "5000",
        loaded_miles: "2000", deadhead_miles: null, deadhead_missing_loads: 3, net_cents: 0,
      },
    ] as never)
    const [row] = await truckPnlRange(CARRIER, range)
    expect(row.deadhead_missing_loads).toBe(3)
    expect(row.deadhead_miles).toBeNull()
    expect(row.net_cents).toBe(365000)
  })

  it("defaults the blank count to 0 rather than NaN when the column is absent", async () => {
    queryMock.mockResolvedValue([
      {
        truck_id: "t1", unit_number: "101", revenue_cents: "0", fuel_cents: "0",
        maintenance_cents: "0", toll_cents: "0", other_expense_cents: "0",
        loaded_miles: null, deadhead_miles: null, net_cents: 0,
      },
    ] as never)
    const [row] = await truckPnlRange(CARRIER, range)
    expect(row.deadhead_missing_loads).toBe(0)
  })

  it("subtracts imported toll spend (hub.toll_transactions) from net_cents like every other cost bucket", async () => {
    queryMock.mockResolvedValue([
      {
        truck_id: "t1", unit_number: "101", revenue_cents: "500000", fuel_cents: "120000",
        maintenance_cents: "10000", toll_cents: "7500", other_expense_cents: "5000",
        loaded_miles: "2000", deadhead_miles: "100", net_cents: 0,
      },
    ] as never)
    const [row] = await truckPnlRange(CARRIER, range)
    expect(row.net_cents).toBe(357500)
  })
})
