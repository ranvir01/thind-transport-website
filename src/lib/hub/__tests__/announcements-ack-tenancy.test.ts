/**
 * Regression for ackReport's acks/pendingUsers queries joining/filtering
 * hub.users by user_id alone (no carrier_id guard), unlike every other
 * cross-table join in this codebase (assignFuelToLoad, recentFacilityStops,
 * threadReads). Not exploitable today — announcement_acks.user_id is only
 * ever written by driverAcknowledgeAnnouncement after it re-checks the
 * announcement belongs to the caller's carrier — but it was the one query in
 * this subsystem relying on that invariant instead of a WHERE/JOIN clause.
 * (1c tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "../db"
import { ackReport } from "../announcements"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const ANNOUNCEMENT = "22222222-2222-2222-2222-222222222222"

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockClear()
  queryMock.mockResolvedValue([])
  queryOneMock.mockResolvedValue(null)
})

describe("ackReport", () => {
  it("scopes the acks join and pending-users lookup by carrier_id, not user_id alone", async () => {
    queryOneMock.mockResolvedValueOnce({
      id: ANNOUNCEMENT, carrier_id: CARRIER, audience: { all: true },
    } as never)

    await ackReport(CARRIER, ANNOUNCEMENT)

    const acksCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("hub.announcement_acks"))
    expect(acksCall).toBeTruthy()
    expect(String(acksCall![0])).toContain("u.id = k.user_id AND u.carrier_id = $2")
    expect(acksCall![1]).toEqual([ANNOUNCEMENT, CARRIER])

    const pendingCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("SELECT name FROM hub.users"))
    expect(pendingCall).toBeTruthy()
    expect(String(pendingCall![0])).toContain("WHERE carrier_id = $2 AND id = ANY($1)")
    expect((pendingCall![1] as unknown[])[1]).toBe(CARRIER)
  })

  it("returns empty without querying acks for a foreign announcement", async () => {
    queryOneMock.mockResolvedValueOnce(null)
    const result = await ackReport(CARRIER, ANNOUNCEMENT)
    expect(result).toEqual({ acked: [], pending: [] })
    expect(queryMock).not.toHaveBeenCalled()
  })
})
