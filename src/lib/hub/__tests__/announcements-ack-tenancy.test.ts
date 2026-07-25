/**
 * Regression: ackReport's acks query joined hub.users on user_id alone, no
 * carrier_id filter — hub.announcement_acks has no carrier_id column of its
 * own (migration 005), so this was the one join in the announcements
 * subsystem that didn't follow the pattern every other tenancy-audited join
 * here already enforces (facilities notes, AR aging payments). Not
 * exploitable today: acknowledgeAnnouncement is only ever called from
 * driverAcknowledgeAnnouncement, which first confirms the announcement
 * belongs to the caller's carrier — but that's a single call-site invariant
 * standing in for a WHERE clause. (Subsystem-audit rotation.)
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
  queryOneMock.mockResolvedValue({
    id: ANNOUNCEMENT,
    carrier_id: CARRIER,
    audience: { all: true },
  } as never)
})

describe("ackReport", () => {
  it("scopes the acks join by carrier_id, not user_id alone", async () => {
    await ackReport(CARRIER, ANNOUNCEMENT)
    // calls[0] is audienceUserIds's own query; the acks join is the second call.
    const [sql, params] = queryMock.mock.calls[1]
    expect(String(sql)).toContain("u.id = k.user_id AND u.carrier_id = $2")
    expect(params).toEqual([ANNOUNCEMENT, CARRIER])
  })

  it("returns empty when the announcement belongs to a different carrier", async () => {
    queryOneMock.mockResolvedValueOnce(null)
    const report = await ackReport(CARRIER, "foreign-announcement")
    expect(report).toEqual({ acked: [], pending: [] })
    expect(queryMock).not.toHaveBeenCalled()
  })
})
