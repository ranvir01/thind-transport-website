/**
 * Regression for the hole where addFacilityNote inserted a note against any
 * facilityId with no check that it belonged to the caller's carrier, and
 * FACILITY_LIST_SELECT's note_count/stop_count/avg_dwell_minutes subqueries
 * correlated by facility_id alone — so a forged cross-tenant note inflated
 * counts a victim carrier saw on its own facility list. (1c tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "../db"
import { addFacilityNote, listFacilities, recentFacilityStops } from "../facilities"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const FACILITY = "22222222-2222-2222-2222-222222222222"

beforeEach(() => {
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
})

describe("addFacilityNote", () => {
  it("inserts through a facility-ownership join (assignFuelToLoad pattern)", async () => {
    queryMock.mockResolvedValueOnce([{ id: "note-1" }])
    const added = await addFacilityNote(CARRIER, FACILITY, {
      body: "Dock 4, ask for Mike",
      author: { id: "u1", name: "Priya", role: "dispatcher" },
    })
    expect(added).toBe(true)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("SELECT f.carrier_id, f.id")
    expect(String(sql)).toContain("FROM hub.facilities f")
    expect(String(sql)).toContain("WHERE f.carrier_id = $1 AND f.id = $2")
    expect((params as unknown[]).slice(0, 2)).toEqual([CARRIER, FACILITY])
  })

  it("returns false for a foreign facility (no row inserted)", async () => {
    queryMock.mockResolvedValueOnce([])
    const added = await addFacilityNote(CARRIER, FACILITY, {
      body: "x",
      author: { id: "u1", name: "Priya", role: "dispatcher" },
    })
    expect(added).toBe(false)
  })
})

describe("FACILITY_LIST_SELECT subqueries", () => {
  it("correlates stop_count, avg_dwell_minutes, and note_count on carrier_id, not facility_id alone", async () => {
    await listFacilities(CARRIER)
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("s.facility_id = f.id AND s.carrier_id = f.carrier_id")
    expect(sql).toContain("n.facility_id = f.id AND n.carrier_id = f.carrier_id")
  })
})

describe("recentFacilityStops", () => {
  it("scopes the stop-history join by carrier_id, not facility_id alone", async () => {
    await recentFacilityStops(CARRIER, FACILITY)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("l.id = s.load_id AND l.carrier_id = s.carrier_id")
    expect(String(sql)).toContain("s.facility_id = $1 AND s.carrier_id = $2")
    expect(params).toEqual([FACILITY, CARRIER, 10])
  })
})
