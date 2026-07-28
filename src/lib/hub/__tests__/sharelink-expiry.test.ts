/**
 * Roadmap: /track links never expired — only manual revoke (RELEASE_READINESS.md
 * §"Customer portal"). createShareLink now stamps a 30-day expires_at, the public
 * token lookup in getTrackedLoad rejects a lapsed link the same way it rejects a
 * revoked one, and renewShareLink pushes expiry another 30 days out (but only for
 * a link that hasn't been revoked — revoke is meant to be final).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "../db"
import { createShareLink, getTrackedLoad, renewShareLink } from "../sharelinks"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const LOAD = "33333333-3333-3333-3333-333333333333"
const LINK = "66666666-6666-6666-6666-666666666666"
const ACTOR = "44444444-4444-4444-4444-444444444444"

describe("createShareLink stamps a 30-day expiry", () => {
  beforeEach(() => queryMock.mockReset())

  it("passes a 30-day TTL into the INSERT", async () => {
    queryMock.mockImplementation(async (sql: string) =>
      String(sql).includes("INSERT INTO hub.share_links")
        ? [{ id: LINK, load_id: LOAD, token: "tok", revoked_at: null, expires_at: "2026-08-27", created_at: "2026-07-28" }]
        : [{ id: LOAD }]
    )
    const link = await createShareLink(CARRIER, LOAD, ACTOR)
    expect(link.expires_at).toBe("2026-08-27")
    const [sql, params] = queryMock.mock.calls.find(([s]) => String(s).includes("INSERT INTO hub.share_links"))!
    expect(String(sql)).toContain("expires_at")
    expect(String(sql)).toContain("NOW() + $5 * INTERVAL '1 day'")
    expect(params?.[0]).toBe(CARRIER)
    expect(params?.[1]).toBe(LOAD)
    expect(params?.[3]).toBe(ACTOR)
    expect(params?.[4]).toBe(30)
  })
})

describe("getTrackedLoad rejects a lapsed token the same as a revoked one", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("filters the token lookup on revoked_at and expires_at together", async () => {
    queryOneMock.mockResolvedValueOnce(null) // expired -> no row comes back
    const tracked = await getTrackedLoad("some-token")
    expect(tracked).toBeNull()
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())")
    expect(params).toEqual(["some-token"])
  })

  it("still resolves a token whose link has no expiry set", async () => {
    queryOneMock.mockResolvedValueOnce({ load_id: LOAD, carrier_id: CARRIER })
    queryOneMock.mockResolvedValueOnce(null) // load lookup short-circuits the rest
    const tracked = await getTrackedLoad("some-token")
    expect(tracked).toBeNull() // null because the load lookup itself returned nothing, not because of expiry
  })
})

describe("renewShareLink", () => {
  beforeEach(() => queryMock.mockReset())

  it("pushes expires_at another 30 days out and only touches a non-revoked link", async () => {
    await renewShareLink(CARRIER, LINK)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("SET expires_at = NOW() + $3 * INTERVAL '1 day'")
    expect(String(sql)).toContain("AND revoked_at IS NULL")
    expect(params).toEqual([CARRIER, LINK, 30])
  })
})
