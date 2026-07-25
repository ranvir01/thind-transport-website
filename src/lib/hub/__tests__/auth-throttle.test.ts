/**
 * Login throttling (AGENTS.md: security-critical, best-effort by design —
 * a database outage or query error must never lock everyone out). Pins the
 * lockout threshold, the case-insensitive email key, and every fail-open path.
 *
 * Also pins the scoped keys: signup shares hub.auth_attempts with login but
 * must never share a KEY, or a bot hammering signup with someone's address
 * would lock that person out of logging in.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  hubDbAvailable: vi.fn(() => true),
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { hubDbAvailable, query, queryOne } from "../db"
import { isLockedOut, recordAttempt } from "../auth-throttle"

const hubDbAvailableMock = vi.mocked(hubDbAvailable)
const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

beforeEach(() => {
  hubDbAvailableMock.mockReset().mockReturnValue(true)
  queryMock.mockReset().mockResolvedValue([])
  queryOneMock.mockReset().mockResolvedValue(null)
})

describe("isLockedOut", () => {
  it("is not locked out with fewer than 5 recent failures", async () => {
    queryOneMock.mockResolvedValue({ failures: "4" })
    expect(await isLockedOut("driver@example.com")).toBe(false)
  })

  it("locks out at exactly 5 recent failures", async () => {
    queryOneMock.mockResolvedValue({ failures: "5" })
    expect(await isLockedOut("driver@example.com")).toBe(true)
  })

  it("stays locked out above the threshold", async () => {
    queryOneMock.mockResolvedValue({ failures: "12" })
    expect(await isLockedOut("driver@example.com")).toBe(true)
  })

  it("lowercases the email in the lookup", async () => {
    await isLockedOut("Driver@Example.COM")
    expect(queryOneMock.mock.calls[0][1]).toEqual(["driver@example.com"])
  })

  it("fails open when the hub database is unavailable", async () => {
    hubDbAvailableMock.mockReturnValue(false)
    queryOneMock.mockResolvedValue({ failures: "99" })
    expect(await isLockedOut("driver@example.com")).toBe(false)
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("fails open when the failure-count query throws", async () => {
    queryOneMock.mockRejectedValue(new Error("connection reset"))
    expect(await isLockedOut("driver@example.com")).toBe(false)
  })

  it("treats a missing row as zero failures", async () => {
    queryOneMock.mockResolvedValue(null)
    expect(await isLockedOut("driver@example.com")).toBe(false)
  })
})

describe("recordAttempt", () => {
  it("no-ops when the hub database is unavailable", async () => {
    hubDbAvailableMock.mockReturnValue(false)
    await recordAttempt("driver@example.com", false)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("records a lowercased failed attempt", async () => {
    await recordAttempt("Driver@Example.COM", false)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("INSERT INTO hub.auth_attempts")
    expect(params).toEqual(["driver@example.com", false])
  })

  it("records a successful attempt and sweeps stale rows for that email", async () => {
    await recordAttempt("driver@example.com", true)
    expect(queryMock).toHaveBeenCalledTimes(2)
    const [insertSql, insertParams] = queryMock.mock.calls[0]
    expect(String(insertSql)).toContain("INSERT INTO hub.auth_attempts")
    expect(insertParams).toEqual(["driver@example.com", true])
    const [deleteSql, deleteParams] = queryMock.mock.calls[1]
    expect(String(deleteSql)).toContain("DELETE FROM hub.auth_attempts")
    expect(deleteParams).toEqual(["driver@example.com"])
  })

  it("does not sweep old rows on a failed attempt", async () => {
    await recordAttempt("driver@example.com", false)
    expect(queryMock).toHaveBeenCalledTimes(1)
  })

  it("swallows insert errors so a bookkeeping failure never blocks login", async () => {
    queryMock.mockRejectedValue(new Error("db unavailable"))
    await expect(recordAttempt("driver@example.com", true)).resolves.toBeUndefined()
  })
})

describe("throttle scopes", () => {
  it("defaults to the login scope, keeping the historical bare-email key", async () => {
    await isLockedOut("driver@example.com")
    await recordAttempt("driver@example.com", false)
    expect(queryOneMock.mock.calls[0][1]).toEqual(["driver@example.com"])
    expect(queryMock.mock.calls[0][1]).toEqual(["driver@example.com", false])
  })

  it("namespaces signup keys so they never collide with the login key", async () => {
    await isLockedOut("email:driver@example.com", "signup")
    await recordAttempt("ip:203.0.113.7", false, "signup")
    expect(queryOneMock.mock.calls[0][1]).toEqual(["signup:email:driver@example.com"])
    expect(queryMock.mock.calls[0][1]).toEqual(["signup:ip:203.0.113.7", false])
  })

  it("a locked-out signup key leaves that email's login budget untouched", async () => {
    // Same email, two scopes: the lookups must not read the same row set.
    await isLockedOut("email:victim@example.com", "signup")
    await isLockedOut("victim@example.com")
    const [signupKey] = queryOneMock.mock.calls[0][1] as string[]
    const [loginKey] = queryOneMock.mock.calls[1][1] as string[]
    expect(signupKey).not.toBe(loginKey)
  })

  it("lowercases and trims scoped keys too", async () => {
    await isLockedOut("  Email:Owner@Cascade.Example  ", "signup")
    expect(queryOneMock.mock.calls[0][1]).toEqual(["signup:email:owner@cascade.example"])
  })

  it("counts only failures inside the 15-minute window, whatever the scope", async () => {
    await isLockedOut("email:driver@example.com", "signup")
    const sql = String(queryOneMock.mock.calls[0][0])
    expect(sql).toContain("success = FALSE")
    expect(sql).toContain("INTERVAL '15 minutes'")
  })

  it("fails open for signup too when the database is unavailable", async () => {
    hubDbAvailableMock.mockReturnValue(false)
    queryOneMock.mockResolvedValue({ failures: "99" })
    expect(await isLockedOut("email:driver@example.com", "signup")).toBe(false)
    await recordAttempt("email:driver@example.com", false, "signup")
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("public-form scope carries its looser 20-per-15-minute budget", async () => {
    // 19 recent submissions: a busy recruiting office is still fine…
    queryOneMock.mockResolvedValue({ failures: "19" })
    expect(await isLockedOut("ip:203.0.113.9", "public-form")).toBe(false)
    // …the 20th trips it.
    queryOneMock.mockResolvedValue({ failures: "20" })
    expect(await isLockedOut("ip:203.0.113.9", "public-form")).toBe(true)
    expect(queryOneMock.mock.calls[0][1]).toEqual(["public-form:ip:203.0.113.9"])
  })

  it("honors a tighter per-call override (the email key's 6)", async () => {
    queryOneMock.mockResolvedValue({ failures: "6" })
    expect(await isLockedOut("driver@example.com", "public-form", 6)).toBe(true)
    queryOneMock.mockResolvedValue({ failures: "5" })
    expect(await isLockedOut("driver@example.com", "public-form", 6)).toBe(false)
  })
})
