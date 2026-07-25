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
  it("uses GPS pings for a truck that has position data this quarter, tagging jurisdiction_miles rows 'pings'", async () => {
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
  })

  it("falls back to imported jurisdiction miles when no truck has pings this quarter", async () => {
    mockQueries({
      trucks: [],
      imported: [{ truck_id: "t2", jurisdiction: "OR", miles: "400" }],
    })

    const { mileageSource, result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(mileageSource).toBe("import")
    expect(result.fleetMiles).toBe(400)
    expect(pingsToMilesMock).not.toHaveBeenCalled()
  })

  // Regression: `if (trucks.length > 0) { pings } else { import }` made the two
  // sources exclusive PER FLEET, so one ELD-connected truck silently dropped
  // every manual-sheet truck's miles from the return — an understated filing,
  // which is the direction that draws an audit.
  it("adds imported miles for trucks without pings to the pinged trucks' miles", async () => {
    mockQueries({
      trucks: [{ truck_id: "t1" }],
      pings: [{ lat: 47.6, lng: -122.3, ts: "2026-04-01T00:00:00Z" }],
      imported: [
        { truck_id: "t2", jurisdiction: "OR", miles: "1200" },
        { truck_id: "t3", jurisdiction: "WA", miles: "800" },
        { truck_id: "t4", jurisdiction: "ID", miles: "500" },
        { truck_id: "t5", jurisdiction: "OR", miles: "300" },
      ],
    })
    pingsToMilesMock.mockReturnValue({ WA: 250 })

    const { mileageSource, result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(mileageSource).toBe("mixed")
    // WA 250 pinged + 800 imported, OR 1200 + 300 imported, ID 500 imported.
    expect(result.fleetMiles).toBe(3050)
    const byJur = Object.fromEntries(result.rows.map((r) => [r.jurisdiction, r.miles]))
    expect(byJur.WA).toBe(1050)
    expect(byJur.OR).toBe(1500)
    expect(byJur.ID).toBe(500)
  })

  it("never counts both sources for the same truck — a pinged truck's imported rows are ignored", async () => {
    mockQueries({
      trucks: [{ truck_id: "t1" }],
      pings: [{ lat: 47.6, lng: -122.3, ts: "2026-04-01T00:00:00Z" }],
      // A stale manual sheet for the same truck the ELD already covers.
      imported: [{ truck_id: "t1", jurisdiction: "WA", miles: "9999" }],
    })
    pingsToMilesMock.mockReturnValue({ WA: 250 })

    const { mileageSource, result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(result.fleetMiles).toBe(250)
    expect(mileageSource).toBe("pings")
  })

  it("still takes a glitch-only pinged truck off the import path, and keeps the 'pings' label", async () => {
    mockQueries({
      trucks: [{ truck_id: "t1" }],
      pings: [{ lat: 47.6, lng: -122.3, ts: "2026-04-01T00:00:00Z" }],
      imported: [{ truck_id: "t1", jurisdiction: "WA", miles: "700" }],
    })
    pingsToMilesMock.mockReturnValue({}) // every segment dropped as a GPS glitch

    const { mileageSource, result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(result.fleetMiles).toBe(0)
    expect(mileageSource).toBe("pings")
  })

  it("reads only the newest import run so a second import run can never double-count the quarter", async () => {
    const calls = mockQueries({ trucks: [], imported: [{ truck_id: "t2", jurisdiction: "WA", miles: "1000" }] })
    await computeIftaQuarter("carrier-1", "2026Q2", actor)
    const importRead = calls.find(
      (c) => c.sql.includes("FROM hub.jurisdiction_miles") && c.sql.includes("source = 'import'")
    )
    expect(importRead).toBeDefined()
    expect(importRead!.sql).toMatch(/run_id = \(\s*SELECT run_id/)
    expect(importRead!.sql).toContain("LIMIT 1")
  })

  it("counts only tractor fuel toward tax-paid gallons, excluding reefer/DEF at the query level", async () => {
    const calls = mockQueries({
      trucks: [],
      imported: [{ truck_id: "t2", jurisdiction: "WA", miles: "1000" }],
      fuel: [{ jurisdiction: "WA", gallons: "150" }],
    })

    const { result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    const fuelQuery = calls.find((c) => c.sql.includes("FROM hub.fuel_transactions"))
    expect(fuelQuery!.sql).toContain("fuel_use = 'tractor'")
    expect(result.fleetGallons).toBe(150)
  })

  it("drops a fuel row with no resolved jurisdiction ('??') instead of taxing it, but reports the dropped gallons", async () => {
    mockQueries({
      trucks: [],
      imported: [{ truck_id: "t2", jurisdiction: "WA", miles: "1000" }],
      fuel: [{ jurisdiction: "??", gallons: "80" }],
    })

    const { result, unknownJurisdictionGallons } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(result.fleetGallons).toBe(0)
    expect(unknownJurisdictionGallons).toBe(80)
  })

  it("persists unknownJurisdictionGallons in the report JSON so the worksheet can surface it", async () => {
    const calls = mockQueries({
      trucks: [],
      imported: [{ truck_id: "t2", jurisdiction: "WA", miles: "1000" }],
      fuel: [
        { jurisdiction: "WA", gallons: "150" },
        { jurisdiction: "??", gallons: "42.5" },
      ],
      rates: [{ jurisdiction: "WA", rate: "0.4940", surcharge_rate: "0" }],
    })

    const { result, unknownJurisdictionGallons } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    // Known-state gallons still tax normally; only the stateless gallons drop.
    expect(result.fleetGallons).toBe(150)
    expect(unknownJurisdictionGallons).toBe(42.5)
    const upsert = calls.find((c) => c.sql.includes("INSERT INTO hub.ifta_reports"))
    expect(upsert).toBeDefined()
    const reportJson = JSON.parse(String(upsert!.params[8]))
    expect(reportJson.unknownJurisdictionGallons).toBe(42.5)
  })

  it("reports zero unknown gallons when every fuel purchase has a state", async () => {
    mockQueries({
      trucks: [],
      imported: [{ truck_id: "t2", jurisdiction: "WA", miles: "1000" }],
      fuel: [{ jurisdiction: "WA", gallons: "150" }],
    })

    const { unknownJurisdictionGallons } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(unknownJurisdictionGallons).toBe(0)
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
