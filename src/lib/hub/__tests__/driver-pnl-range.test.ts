/**
 * The per-driver half of the P&L. Two rules carry the weight: every subquery
 * is guarded by the carrier on BOTH sides of its join (a driver id is a UUID
 * a URL could carry), and pay is null — never zero — for a driver with no
 * settlement in range, matching driverPayCentsForRange so the driver column
 * sums to the fleet card.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query } from "@/lib/hub/db"
import { driverPnlRange, driverPnlRangeCsv, type DriverPnlRow } from "@/lib/hub/reports"

const queryMock = vi.mocked(query)
const CARRIER = "11111111-1111-1111-1111-111111111111"
const RANGE = { from: "2026-01-01", to: "2026-03-31" }

function row(over: Partial<DriverPnlRow> = {}): DriverPnlRow {
  return {
    driver_id: "d1", driver_name: "Harpreet Singh", loads: 12, revenue_cents: "3600000",
    loaded_miles: "12000", deadhead_miles: "1500", deadhead_missing_loads: 0,
    settlements: 3, pay_cents: "1500000", ...over,
  }
}

describe("driverPnlRange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryMock.mockResolvedValue([])
  })

  it("is carrier-scoped at the root and on every join side", async () => {
    await driverPnlRange(CARRIER, RANGE)
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
    const flat = String(sql).replace(/\s+/g, " ")
    expect(flat).toContain("WHERE d.carrier_id = $1")
    expect(params).toEqual([CARRIER, RANGE.from, RANGE.to])
    // Loads and settlements are both reached through the driver; each guard
    // must be a carrier equality, not just the driver id.
    expect((flat.match(/l\.carrier_id = d\.carrier_id/g) ?? []).length).toBeGreaterThanOrEqual(5)
    expect((flat.match(/s\.carrier_id = d\.carrier_id/g) ?? []).length).toBe(2)
    expect(flat).not.toMatch(/JOIN hub\.settlement_lines sl ON sl\.settlement_id = s\.id AND/)
  })

  it("uses the same windows as the truck P&L and the fleet pay figure", async () => {
    await driverPnlRange(CARRIER, RANGE)
    const flat = String(queryMock.mock.calls[0][0]).replace(/\s+/g, " ")
    // Loads by created_at (truckPnlRange's window) …
    expect(flat).toContain("l.created_at >= $2::date AND l.created_at < $3::date + 1")
    // … pay by settlement period_end (driverPayCentsForRange's window).
    expect(flat).toContain("s.period_end BETWEEN $2::date AND $3::date")
    expect(flat).toContain("FILTER (WHERE sl.kind = 'earning')")
  })

  it("returns null pay — never 0 — for a driver with no settlement in range", async () => {
    queryMock.mockResolvedValue([
      row({ settlements: 0, pay_cents: null }) as never,
      row({ driver_id: "d2", settlements: 0, pay_cents: "0" }) as never, // pg SUM over no rows
      row({ driver_id: "d3", settlements: 2, pay_cents: "0" }) as never, // settled, earned nothing
    ])
    const rows = await driverPnlRange(CARRIER, RANGE)
    expect(rows[0].pay_cents).toBeNull()
    expect(rows[1].pay_cents).toBeNull()
    expect(rows[2].pay_cents).toBe("0")
  })

  it("coerces the pg count strings to numbers", async () => {
    queryMock.mockResolvedValue([row({ loads: "7" as never, settlements: "1" as never, deadhead_missing_loads: "2" as never }) as never])
    const [r] = await driverPnlRange(CARRIER, RANGE)
    expect(r.loads).toBe(7)
    expect(r.settlements).toBe(1)
    expect(r.deadhead_missing_loads).toBe(2)
  })
})

describe("driverPnlRangeCsv", () => {
  it("prices per mile in dollars and blanks the unknowns", () => {
    const { filename, csv } = driverPnlRangeCsv([row(), row({ driver_id: "d2", driver_name: "New Hire", settlements: 0, pay_cents: null, loaded_miles: null, deadhead_miles: null })], RANGE)
    expect(filename).toBe("per-driver-pnl_2026-01-01_2026-03-31.csv")
    const lines = csv.trim().split("\n")
    expect(lines[0]).toBe("Driver,Loads,Revenue,LoadedMiles,DeadheadMiles,RevenuePerLoadedMile,Pay,PayPerMile,RevenueAfterPay")
    // 3,600,000¢ / 12,000 loaded mi = $3.00/mi; 1,500,000¢ / 13,500 total mi = $1.11/mi
    expect(lines[1]).toBe("Harpreet Singh,12,36000.00,12000,1500,3.00,15000.00,1.11,21000.00")
    // No miles → no rate; no settlement → no pay, no per-mile pay, no after-pay.
    expect(lines[2]).toBe("New Hire,12,36000.00,0,0,,,,")
  })
})
