/**
 * GET /api/hub/role-hint is an unauthenticated account-existence + role
 * oracle. It must share login's throttle infrastructure but NEVER login's
 * key — probing an address cannot lock that person out of signing in.
 *
 * Locked-out and unknown-email responses are byte-identical: a distinct
 * 429 would itself be the oracle.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/users", () => ({ findHubUserByEmail: vi.fn() }))
vi.mock("@/lib/hub/auth-throttle", () => ({
  isLockedOut: vi.fn(async () => false),
  recordAttempt: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/landing", () => ({
  hubRoleLabel: (role: string) => `Label:${role}`,
}))

import { findHubUserByEmail } from "@/lib/hub/users"
import { isLockedOut, recordAttempt } from "@/lib/hub/auth-throttle"
import { GET } from "@/app/api/hub/role-hint/route"

const findMock = vi.mocked(findHubUserByEmail)
const lockedMock = vi.mocked(isLockedOut)
const recordMock = vi.mocked(recordAttempt)

const EMPTY = { role: null, label: null }

function req(email: string | null, ip = "203.0.113.9") {
  const url = email == null
    ? "https://loadoff.test/api/hub/role-hint"
    : `https://loadoff.test/api/hub/role-hint?email=${encodeURIComponent(email)}`
  return new Request(url, { headers: ip ? { "x-forwarded-for": ip } : {} })
}

async function body(res: Response) {
  return res.json() as Promise<{ role: string | null; label: string | null }>
}

beforeEach(() => {
  findMock.mockReset()
  lockedMock.mockReset().mockResolvedValue(false)
  recordMock.mockReset()
})

describe("GET /api/hub/role-hint", () => {
  it("returns empty for a missing or malformed email without touching throttle or the user table", async () => {
    expect(await body(await GET(req(null)))).toEqual(EMPTY)
    expect(await body(await GET(req("not-an-email")))).toEqual(EMPTY)
    expect(lockedMock).not.toHaveBeenCalled()
    expect(recordMock).not.toHaveBeenCalled()
    expect(findMock).not.toHaveBeenCalled()
  })

  it("returns the role label for a known hub user and charges email + IP", async () => {
    findMock.mockResolvedValue({ role: "dispatcher" } as never)
    const res = await GET(req("Dispatch@Demo.thind"))
    expect(await body(res)).toEqual({ role: "dispatcher", label: "Label:dispatcher" })
    expect(lockedMock).toHaveBeenCalledWith("Dispatch@Demo.thind", "role-hint")
    expect(lockedMock).toHaveBeenCalledWith("ip:203.0.113.9", "role-hint", 20)
    expect(recordMock).toHaveBeenCalledWith("Dispatch@Demo.thind", false, "role-hint")
    expect(recordMock).toHaveBeenCalledWith("ip:203.0.113.9", false, "role-hint")
    expect(findMock).toHaveBeenCalledWith("Dispatch@Demo.thind")
  })

  it("returns the same empty body for an unknown email, still charging the lookup", async () => {
    findMock.mockResolvedValue(null)
    expect(await body(await GET(req("nobody@example.com")))).toEqual(EMPTY)
    expect(recordMock).toHaveBeenCalled()
    expect(findMock).toHaveBeenCalled()
  })

  it("returns that same empty body when the email key is locked, without looking the user up", async () => {
    lockedMock.mockImplementation(async (key, scope) => scope === "role-hint" && !String(key).startsWith("ip:"))
    findMock.mockResolvedValue({ role: "owner" } as never)
    expect(await body(await GET(req("owner@demo.thind")))).toEqual(EMPTY)
    expect(findMock).not.toHaveBeenCalled()
    expect(recordMock).not.toHaveBeenCalled()
  })

  it("returns that same empty body when the IP key is locked (looser 20 budget)", async () => {
    lockedMock.mockImplementation(async (key) => String(key).startsWith("ip:"))
    expect(await body(await GET(req("owner@demo.thind")))).toEqual(EMPTY)
    expect(findMock).not.toHaveBeenCalled()
    expect(recordMock).not.toHaveBeenCalled()
  })

  it("skips the IP key when no client address is present, still throttling the email", async () => {
    findMock.mockResolvedValue(null)
    await GET(req("owner@demo.thind", ""))
    const keys = lockedMock.mock.calls.map(([key]) => key)
    expect(keys).toEqual(["owner@demo.thind"])
    expect(recordMock.mock.calls.map(([key]) => key)).toEqual(["owner@demo.thind"])
  })
})
