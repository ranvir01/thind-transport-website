/**
 * gettingStartedState (src/app/hub/_actions/onboarding.ts) drives the
 * post-signup checklist (setup-guide.ts, showSetupChecklist) — every prior
 * test for that surface (setup-guide-checklist.test.ts) mocks its return
 * value directly, so the function itself had zero coverage: no pin that it
 * refuses to query without a session, that it scopes every subquery to the
 * caller's OWN carrier_id (never a client-supplied id — there is no
 * parameter to supply one), or that a carrier with all-zero counts renders
 * every step as not-done rather than crashing/defaulting true.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../session", () => ({ getActiveHubUser: vi.fn() }))

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { getActiveHubUser } from "../session"
import { queryOne } from "../db"
import { gettingStartedState } from "@/app/hub/_actions/onboarding"

const getActiveHubUserMock = vi.mocked(getActiveHubUser)
const queryOneMock = vi.mocked(queryOne)

const CARRIER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const CARRIER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

function ownerOf(carrierId: string) {
  return { id: "u1", name: "Priya", email: "p@a.com", role: "owner" as const, carrierId }
}

beforeEach(() => {
  getActiveHubUserMock.mockReset()
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
})

describe("gettingStartedState", () => {
  it("returns null and never queries the database for a signed-out caller", async () => {
    getActiveHubUserMock.mockResolvedValue(null)
    const result = await gettingStartedState()
    expect(result).toBeNull()
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("scopes every subquery to the caller's own carrier_id, not a wider or client-chosen scope", async () => {
    getActiveHubUserMock.mockResolvedValue(ownerOf(CARRIER_A))
    queryOneMock.mockResolvedValue({
      trucks: "0", drivers: "0", customers: "0", loads: "0", packet: "0", fuel: "0",
    })

    await gettingStartedState()

    expect(queryOneMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryOneMock.mock.calls[0]
    // Every counted subquery must filter on carrier_id = $1 — a single
    // unscoped subquery here would leak another tenant's counts into this
    // carrier's checklist.
    expect(String(sql).match(/carrier_id = \$1/g)?.length).toBe(6)
    expect(String(sql)).not.toMatch(/\$2/)
    expect(params).toEqual([CARRIER_A])
  })

  it("a different caller's carrier_id is bound, not reused across callers", async () => {
    getActiveHubUserMock.mockResolvedValue(ownerOf(CARRIER_B))
    queryOneMock.mockResolvedValue({
      trucks: "1", drivers: "1", customers: "1", loads: "1", packet: "1", fuel: "1",
    })

    await gettingStartedState()

    const [, params] = queryOneMock.mock.calls[0]
    expect(params).toEqual([CARRIER_B])
    expect(params).not.toEqual([CARRIER_A])
  })

  it("returns null when the carrier row lookup comes back empty", async () => {
    getActiveHubUserMock.mockResolvedValue(ownerOf(CARRIER_A))
    queryOneMock.mockResolvedValue(null)
    const result = await gettingStartedState()
    expect(result).toBeNull()
  })

  it("a brand-new tenant with all-zero counts renders every step as not-done", async () => {
    getActiveHubUserMock.mockResolvedValue(ownerOf(CARRIER_A))
    queryOneMock.mockResolvedValue({
      trucks: "0", drivers: "0", customers: "0", loads: "0", packet: "0", fuel: "0",
    })

    const result = await gettingStartedState()

    expect(result).toEqual({
      trucks: false, drivers: false, customers: false, loads: false, packet: false, fuel: false,
    })
  })

  it("maps each count independently — one populated table doesn't mark unrelated steps done", async () => {
    getActiveHubUserMock.mockResolvedValue(ownerOf(CARRIER_A))
    queryOneMock.mockResolvedValue({
      trucks: "3", drivers: "0", customers: "0", loads: "0", packet: "0", fuel: "0",
    })

    const result = await gettingStartedState()

    expect(result).toEqual({
      trucks: true, drivers: false, customers: false, loads: false, packet: false, fuel: false,
    })
  })
})
