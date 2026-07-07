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
        ? [{ id: "1", load_id: OWNED_LOAD, token: "tok", revoked_at: null, created_at: "2026-07-07" }]
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
})
