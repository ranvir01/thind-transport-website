/**
 * Regression for ackReport's acks/pendingUsers queries joining/filtering
 * hub.users by user_id alone (no carrier_id guard), unlike every other
 * cross-table join in this codebase (assignFuelToLoad, recentFacilityStops,
 * threadReads). The write path used to INSERT hub.announcement_acks with
 * raw ids and leave the only tenant check in driverAcknowledgeAnnouncement
 * — the same "caller-only" shape as the website_leads leak. The insert now
 * SELECT…JOINs the owned announcement and user (markThreadRead pattern).
 * (1c tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "../db"
import { ackReport, acknowledgeAnnouncement } from "../announcements"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const ANNOUNCEMENT = "22222222-2222-2222-2222-222222222222"
const USER = "33333333-3333-3333-3333-333333333333"

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

describe("acknowledgeAnnouncement", () => {
  it("inserts through an announcement+user ownership join, not VALUES on raw ids", async () => {
    await acknowledgeAnnouncement(CARRIER, ANNOUNCEMENT, USER, "sig")

    const insert = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO hub.announcement_acks")
    )
    expect(insert).toBeTruthy()
    const sql = String(insert![0])
    expect(sql).toContain("FROM hub.announcements a")
    expect(sql).toContain("JOIN hub.users u ON u.id = $3 AND u.carrier_id = a.carrier_id")
    expect(sql).toContain("WHERE a.id = $1 AND a.carrier_id = $2")
    expect(sql).not.toMatch(/VALUES\s*\(/)
    expect(insert![1]).toEqual([ANNOUNCEMENT, CARRIER, USER, "sig"])
  })

  it("writes nothing when the announcement is not this carrier's (SELECT matches zero rows)", async () => {
    await acknowledgeAnnouncement(CARRIER, ANNOUNCEMENT, USER)

    const insert = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO hub.announcement_acks")
    )
    expect(insert).toBeTruthy()
    expect(String(insert![0])).toContain("a.carrier_id = $2")
    expect(insert![1]?.[1]).toBe(CARRIER)
  })
})
