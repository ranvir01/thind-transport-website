/**
 * Regression (truck-subsystem audit, 1c-style sweep): createShareLink minted a
 * public tracking token for any loadId the caller supplied, with no check that
 * the load belonged to the caller's carrier. requirePermission("loads:write")
 * only confirms the actor's role within their own carrier — it says nothing
 * about which load they're operating on. Any hub user could mint a working
 * public /track link for another tenant's load and leak its reference, status,
 * stops, and city-level GPS through the unauthenticated tracking page.
 * getTrackedLoad's own load lookup also dropped the share link's carrier_id on
 * the floor, so it's hardened here too (defense-in-depth, both sides guarded).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "../db"
import { createShareLink, getTrackedLoad } from "../sharelinks"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const FOREIGN_LOAD = "22222222-2222-2222-2222-222222222222"
const OWNED_LOAD = "33333333-3333-3333-3333-333333333333"
const ACTOR = "44444444-4444-4444-4444-444444444444"

describe("createShareLink cross-table tenancy (AGENTS.md both-sides rule)", () => {
  beforeEach(() => queryMock.mockReset())

  it("rejects a foreign loadId before minting a public token", async () => {
    queryMock.mockResolvedValue([]) // load lookup finds nothing under this carrier
    await expect(createShareLink(CARRIER, FOREIGN_LOAD, ACTOR)).rejects.toThrow("Load not found")
    const inserts = queryMock.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO hub.share_links"))
    expect(inserts).toHaveLength(0)
  })

  it("mints a token when the load belongs to the carrier", async () => {
    queryMock.mockImplementation(async (sql: string) =>
      String(sql).includes("INSERT INTO hub.share_links")
        ? [{ id: "1", load_id: OWNED_LOAD, token: "tok", revoked_at: null, expires_at: "2026-08-06", created_at: "2026-07-07" }]
        : [{ id: OWNED_LOAD }]
    )
    const link = await createShareLink(CARRIER, OWNED_LOAD, ACTOR)
    expect(link.token).toBe("tok")
    const inserts = queryMock.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO hub.share_links"))
    expect(inserts).toHaveLength(1)
  })
})

describe("getTrackedLoad scopes the load read by the share link's own carrier_id", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("passes the link's carrier_id into the load lookup", async () => {
    queryOneMock.mockResolvedValueOnce({ load_id: OWNED_LOAD, carrier_id: CARRIER })
    queryOneMock.mockResolvedValueOnce(null) // load query short-circuits the rest
    await getTrackedLoad("some-token")
    const [sql, params] = queryOneMock.mock.calls[1]
    expect(String(sql)).toContain("WHERE l.id = $1 AND l.carrier_id = $2 AND l.deleted_at IS NULL")
    expect(params).toEqual([OWNED_LOAD, CARRIER])
  })

  it("scopes the public stops and position queries by the link's carrier_id", async () => {
    queryOneMock.mockResolvedValueOnce({ load_id: OWNED_LOAD, carrier_id: CARRIER })
    queryOneMock.mockResolvedValueOnce({
      id: OWNED_LOAD, reference: "THD-1001", status: "in_transit",
      equipment: "dry_van", truck_id: "truck-1", carrier_name: "Acme",
    })
    queryOneMock.mockResolvedValueOnce({ lat: 47.1234, lng: -122.5678, ts: "2026-07-11" })
    await getTrackedLoad("some-token")

    const [stopsSql, stopsParams] = queryMock.mock.calls[0]
    expect(String(stopsSql)).toContain("FROM hub.stops WHERE load_id = $1 AND carrier_id = $2")
    expect(stopsParams).toEqual([OWNED_LOAD, CARRIER])

    const [pingSql, pingParams] = queryOneMock.mock.calls[2]
    expect(String(pingSql)).toContain("WHERE truck_id = $1 AND carrier_id = $2")
    expect(pingParams).toEqual(["truck-1", CARRIER])
  })
})

/**
 * Regression (loads/dispatch subsystem audit): the load lookup above got its
 * carrier_id guard in a prior round, but the stops and position-ping reads
 * later in the SAME function still keyed off load_id/truck_id alone — the
 * one truly unauthenticated read path in the whole loads subsystem (no
 * session, just a 128-bit token) with two of its three queries missing the
 * carrier_id AGENTS.md requires on every query. Not exploitable today (both
 * ids are already carrier-scoped upstream by the load lookup / assertCarrierRefs
 * at write time), but a public route is exactly where defense-in-depth belongs.
 */
describe("getTrackedLoad carrier-scopes the stops and position-ping reads", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("passes carrier_id into the stops query", async () => {
    queryOneMock.mockResolvedValueOnce({ load_id: OWNED_LOAD, carrier_id: CARRIER })
    queryOneMock.mockResolvedValueOnce({
      id: OWNED_LOAD, reference: "THD-1", status: "booked", equipment: "dry_van",
      truck_id: null, carrier_name: "Thind Transport",
    })
    queryMock.mockResolvedValueOnce([])
    await getTrackedLoad("some-token")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE load_id = $1 AND carrier_id = $2")
    expect(params).toEqual([OWNED_LOAD, CARRIER])
  })

  it("passes carrier_id into the position-ping query for an in-transit load", async () => {
    const TRUCK = "55555555-5555-5555-5555-555555555555"
    queryOneMock.mockResolvedValueOnce({ load_id: OWNED_LOAD, carrier_id: CARRIER })
    queryOneMock.mockResolvedValueOnce({
      id: OWNED_LOAD, reference: "THD-1", status: "in_transit", equipment: "dry_van",
      truck_id: TRUCK, carrier_name: "Thind Transport",
    })
    queryMock.mockResolvedValueOnce([]) // stops
    queryOneMock.mockResolvedValueOnce(null) // ping
    await getTrackedLoad("some-token")
    const [sql, params] = queryOneMock.mock.calls[2]
    expect(String(sql)).toContain("WHERE truck_id = $1 AND carrier_id = $2")
    expect(params).toEqual([TRUCK, CARRIER])
  })
})
