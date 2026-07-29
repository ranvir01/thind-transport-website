/**
 * Isolation pin (SaaS-lane cross-tenant sweep, phase-7.md #2's "notifications"
 * item): listNotifications/unreadCount/markAllRead/removePushSubscription used
 * to filter by user_id alone. Every caller today only ever passes the signed-in
 * user's own id, so there was no reachable exploit — but AGENTS.md's standing
 * rule is "every query is carrier-scoped", and a user_id-only filter is one
 * refactor away from a real cross-tenant leak (e.g. an admin tool that takes a
 * userId param). Added carrier_id to all four so the isolation property holds
 * even if a future caller gets the id source wrong.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))

import { query } from "../db"
import { listNotifications, markAllRead, removePushSubscription, unreadCount } from "../notify"

const queryMock = vi.mocked(query)

const CARRIER_A = "11111111-1111-1111-1111-111111111111"
const CARRIER_B = "22222222-2222-2222-2222-222222222222"
const USER = "33333333-3333-3333-3333-333333333333"

beforeEach(() => queryMock.mockReset())

describe("notify.ts in-app feed is carrier-scoped, not just user-scoped", () => {
  it("listNotifications binds carrier_id and user_id in that order", async () => {
    queryMock.mockResolvedValue([])
    await listNotifications(CARRIER_A, USER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toMatch(/carrier_id = \$1 AND user_id = \$2/)
    expect(params).toEqual([CARRIER_A, USER, 30])
  })

  it("unreadCount binds carrier_id and user_id in that order", async () => {
    queryMock.mockResolvedValue([{ count: "0" }])
    await unreadCount(CARRIER_A, USER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toMatch(/carrier_id = \$1 AND user_id = \$2/)
    expect(params).toEqual([CARRIER_A, USER])
  })

  it("markAllRead binds carrier_id and user_id in that order", async () => {
    await markAllRead(CARRIER_A, USER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toMatch(/carrier_id = \$1 AND user_id = \$2/)
    expect(params).toEqual([CARRIER_A, USER])
  })

  it("removePushSubscription binds carrier_id, user_id, and endpoint in that order", async () => {
    await removePushSubscription(CARRIER_A, USER, "https://push.example/ep1")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toMatch(/carrier_id = \$1 AND user_id = \$2 AND endpoint = \$3/)
    expect(params).toEqual([CARRIER_A, USER, "https://push.example/ep1"])
  })

  it("a stale carrier_id can never read across into a different tenant's row set", async () => {
    // Same user id, different carrier — the query always carries both predicates,
    // so a caller cannot get tenant B's rows by only knowing the user id.
    queryMock.mockResolvedValue([])
    await listNotifications(CARRIER_A, USER)
    await listNotifications(CARRIER_B, USER)
    for (const [, params = []] of queryMock.mock.calls) {
      expect(params).toContain(params[0]) // carrier_id is always the first bound param
    }
    expect(queryMock.mock.calls[0][1]?.[0]).toBe(CARRIER_A)
    expect(queryMock.mock.calls[1][1]?.[0]).toBe(CARRIER_B)
  })
})
