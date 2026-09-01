/**
 * House rule: a table's first reader gets a tenancy test. hub.user_preferences
 * is keyed by user_id, which arrives from a session — the carrier guard in
 * every statement is what keeps a stale or spoofed session on its own tenant.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "../db"
import { getUserPrefs, setUserPref } from "../user-prefs"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const OTHER = "22222222-2222-2222-2222-222222222222"
const USER = "33333333-3333-3333-3333-333333333333"

const flat = (sql: unknown) => String(sql).replace(/\s+/g, " ")

describe("user-prefs tenancy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryMock.mockResolvedValue([])
    queryOneMock.mockResolvedValue(null)
  })

  it("reads by carrier AND user, with the carrier as $1", async () => {
    await getUserPrefs(CARRIER, USER)
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]]
    expect(flat(sql)).toContain("WHERE carrier_id = $1 AND user_id = $2")
    expect(params).toEqual([CARRIER, USER])
  })

  it("returns an empty object, never null, when there is no row", async () => {
    await expect(getUserPrefs(CARRIER, USER)).resolves.toEqual({})
  })

  it("writes the carrier onto a new row and guards the upsert arm by carrier", async () => {
    queryMock.mockResolvedValue([{ user_id: USER }] as never)
    const ok = await setUserPref(CARRIER, USER, "sidebarCollapsed", true)
    expect(ok).toBe(true)
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
    const s = flat(sql)
    expect(s).toContain("INSERT INTO hub.user_preferences")
    // The conflict arm must not update a row that belongs to another carrier.
    expect(s).toMatch(/DO UPDATE .* WHERE hub\.user_preferences\.carrier_id = \$1/)
    expect(params[0]).toBe(CARRIER)
    expect(params[1]).toBe(USER)
    expect(JSON.parse(String(params[2]))).toEqual({ sidebarCollapsed: true })
  })

  it("merges rather than replaces, so one preference cannot erase another", async () => {
    await setUserPref(CARRIER, USER, "sidebarCollapsed", false)
    expect(flat(queryMock.mock.calls[0][0])).toContain("prefs || EXCLUDED.prefs")
  })

  it("reports false when the carrier guard blocks the write", async () => {
    queryMock.mockResolvedValue([])
    await expect(setUserPref(OTHER, USER, "sidebarCollapsed", true)).resolves.toBe(false)
  })
})
