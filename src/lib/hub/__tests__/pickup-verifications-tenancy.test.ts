/**
 * House rule: a new table gets a tenancy test. hub.pickup_verifications is
 * addressed by load ids that arrive from URLs and from the driver app, so
 * every statement carries carrier_id in SQL.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "../db"
import {
  latestPickupVerification,
  latestPickupVerificationsByLoad,
  recordPickupVerification,
} from "../pickup-verifications"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const CARRIER = "11111111-1111-1111-1111-111111111111"
const LOAD = "44444444-4444-4444-4444-444444444444"
const flat = (sql: unknown) => String(sql).replace(/\s+/g, " ")

describe("pickup-verifications tenancy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryMock.mockResolvedValue([])
    queryOneMock.mockResolvedValue(null)
  })

  it("reads the newest row by carrier AND load", async () => {
    await latestPickupVerification(CARRIER, LOAD)
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]]
    expect(flat(sql)).toContain("WHERE carrier_id = $1 AND load_id = $2")
    expect(flat(sql)).toContain("ORDER BY created_at DESC LIMIT 1")
    expect(params).toEqual([CARRIER, LOAD])
  })

  it("batches the board lookup in one carrier-scoped query, newest per load", async () => {
    queryMock.mockResolvedValue([{ load_id: LOAD, result: "verified" }] as never)
    const map = await latestPickupVerificationsByLoad(CARRIER, [LOAD, "55555555-5555-5555-5555-555555555555"])
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
    expect(flat(sql)).toContain("DISTINCT ON (load_id)")
    expect(flat(sql)).toContain("WHERE carrier_id = $1 AND load_id = ANY($2::uuid[])")
    expect(params[0]).toBe(CARRIER)
    expect(map.get(LOAD)?.result).toBe("verified")
  })

  it("skips the database entirely for an empty board", async () => {
    await latestPickupVerificationsByLoad(CARRIER, [])
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("writes the carrier onto every new row", async () => {
    queryMock.mockResolvedValue([{ id: "v1" }] as never)
    await recordPickupVerification({
      carrierId: CARRIER, loadId: LOAD, stopId: "s1", driverId: "d1", truckId: "t1",
      fix: { lat: 47.38, lng: -122.23 }, distanceMiles: 0.1, photoDocumentId: "doc1",
      result: "verified", checks: [],
    })
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
    expect(flat(sql)).toContain("INSERT INTO hub.pickup_verifications")
    expect(params[0]).toBe(CARRIER)
    expect(params.slice(1, 5)).toEqual([LOAD, "s1", "d1", "t1"])
    expect(params[9]).toBe("verified")
  })

  it("stores a missing fix as nulls, not zeros", async () => {
    queryMock.mockResolvedValue([{ id: "v1" }] as never)
    await recordPickupVerification({
      carrierId: CARRIER, loadId: LOAD, stopId: "s1", driverId: "d1", truckId: null,
      fix: null, distanceMiles: null, photoDocumentId: null, result: "unverified", checks: [],
    })
    const params = queryMock.mock.calls[0][1] as unknown[]
    // lat, lng, distance
    expect(params.slice(5, 8)).toEqual([null, null, null])
  })
})
