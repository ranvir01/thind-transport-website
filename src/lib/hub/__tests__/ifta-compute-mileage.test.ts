/**
 * computeIftaQuarter's mileage-source selection, tractor-fuel filter, and
 * carrier scoping had zero coverage beyond the recompute guard (which mocks
 * every query to a blanket []). This pins the pings-vs-import fallback ladder
 * and the standing tenancy rule (every query carrier-scoped) that a future
 * refactor could silently break without any test failing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({ query: vi.fn(), queryOne: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/geo", () => ({ jurisdictionMilesFromPings: vi.fn() }))

import { query } from "@/lib/hub/db"
import { jurisdictionMilesFromPings } from "@/lib/hub/geo"
import { computeIftaQuarter } from "@/lib/hub/ifta"

const queryMock = vi.mocked(query)
const pingsToMilesMock = vi.mocked(jurisdictionMilesFromPings)
const actor = { id: "u1", name: "Dispatcher" }

type Row = Record<string, unknown>
type Call = { sql: string; params: unknown[] }

function mockQueries(overrides: {
  status?: Row[]
  trucks?: Row[]
  pings?: Row[]
  imported?: Row[]
  fuel?: Row[]
  rates?: Row[]
}): Call[] {
  const calls: Call[] = []
  queryMock.mockImplementation(async (...args: unknown[]) => {
    const sql = String(args[0] ?? "")
    const params = (args[1] as unknown[]) ?? []
    calls.push({ sql, params })
    if (sql.includes("SELECT status FROM hub.ifta_reports")) return overrides.status ?? []
    if (sql.includes("SELECT DISTINCT truck_id FROM hub.position_pings")) return overrides.trucks ?? []
    if (sql.includes("SELECT lat, lng, ts FROM hub.position_pings")) return overrides.pings ?? []
    if (sql.includes("FROM hub.jurisdiction_miles") && sql.includes("source = 'import'")) return overrides.imported ?? []
    if (sql.includes("FROM hub.fuel_transactions")) return overrides.fuel ?? []
    if (sql.includes("FROM hub.ifta_tax_rates")) return overrides.rates ?? []
    return []
  })
  return calls
}

beforeEach(() => {
  queryMock.mockReset()
  pingsToMilesMock.mockReset()
})

describe("computeIftaQuarter mileage source selection", () => {
  it("prefers GPS pings when a truck has position data this quarter, tagging jurisdiction_miles rows 'pings'", async () => {
    const calls = mockQueries({
      trucks: [{ truck_id: "t1" }],
      pings: [{ lat: 47.6, lng: -122.3, ts: "2026-04-01T00:00:00Z" }],
    })
    pingsToMilesMock.mockReturnValue({ WA: 250 })

    const { mileageSource, result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(mileageSource).toBe("pings")
    expect(result.fleetMiles).toBe(250)
    const insertMiles = calls.find((c) => c.sql.includes("INSERT INTO hub.jurisdiction_miles"))
    expect(insertMiles).toBeDefined()
    expect(insertMiles!.sql).toContain("'pings'")
    expect(insertMiles!.params).toEqual(["carrier-1", expect.any(String), "t1", "2026Q2", "WA", 250])
    // Import-mileage path must not be consulted when pings exist.
    expect(calls.some((c) => c.sql.includes("source = 'import'"))).toBe(false)
  })

  it("falls back to imported jurisdiction miles when no truck has pings this quarter", async () => {
    mockQueries({
      trucks: [],
      imported: [{ jurisdiction: "OR", miles: "400" }],
    })

    const { mileageSource, result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(mileageSource).toBe("import")
    expect(result.fleetMiles).toBe(400)
    expect(pingsToMilesMock).not.toHaveBeenCalled()
  })

  it("counts only tractor fuel toward tax-paid gallons, excluding reefer/DEF at the query level", async () => {
    const calls = mockQueries({
      trucks: [],
      imported: [{ jurisdiction: "WA", miles: "1000" }],
      fuel: [{ jurisdiction: "WA", gallons: "150" }],
    })

    const { result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    const fuelQuery = calls.find((c) => c.sql.includes("FROM hub.fuel_transactions"))
    expect(fuelQuery!.sql).toContain("fuel_use = 'tractor'")
    expect(result.fleetGallons).toBe(150)
  })

  it("drops a fuel row with no resolved jurisdiction ('??') instead of taxing it", async () => {
    mockQueries({
      trucks: [],
      imported: [{ jurisdiction: "WA", miles: "1000" }],
      fuel: [{ jurisdiction: "??", gallons: "80" }],
    })

    const { result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(result.fleetGallons).toBe(0)
  })

  it("carrier-scopes every mileage/fuel/rate/report query with carrierId as the first parameter", async () => {
    const calls = mockQueries({ trucks: [] })
    await computeIftaQuarter("carrier-9", "2026Q2", actor)
    const scoped = calls.filter((c) =>
      /position_pings|jurisdiction_miles|fuel_transactions|ifta_tax_rates|ifta_reports/.test(c.sql)
    )
    expect(scoped.length).toBeGreaterThan(0)
    for (const call of scoped) {
      expect(call.params[0]).toBe("carrier-9")
    }
  })
})
