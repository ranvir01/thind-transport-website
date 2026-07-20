/**
 * Same JWT-vs-active gap fixed for requireDriverUser/requirePortalUser:
 * login refuses inactive accounts, but hub sessions are JWTs — deactivating
 * an owner/dispatcher/accountant did NOT cut off office access or server
 * actions until the token expired (~30 days). requireOfficeUser,
 * requirePermission, and requirePermissionPage must re-check `active` on
 * every request.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { auth } from "@/lib/auth"
import { queryOne } from "../db"
import { requireOfficeUser, requirePermission, requirePermissionPage } from "../session"

const authMock = vi.mocked(auth)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

function dispatcherSession() {
  return {
    user: { id: "u1", name: "Dee", email: "dee@dispatch.test", role: "dispatcher", carrierId: CARRIER },
  }
}

beforeEach(() => {
  authMock.mockReset()
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
})

describe("requireOfficeUser active-account guard", () => {
  it("re-checks `active` in the per-request account lookup", async () => {
    authMock.mockResolvedValue(dispatcherSession() as never)
    queryOneMock.mockResolvedValue({ id: "u1" })
    const user = await requireOfficeUser()
    expect(user.id).toBe("u1")
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("AND active")
    expect(params).toEqual(["u1", CARRIER])
  })

  it("bounces a deactivated office account to the deactivated dead end, not /hub/login", async () => {
    // Not /hub/login: the proxy still sees a valid token there and bounces
    // the request straight back into the app, re-hitting this same check —
    // an infinite redirect loop (confirmed live with a real deactivated
    // session during a QA drive on 2026-07-20; ERR_TOO_MANY_REDIRECTS).
    authMock.mockResolvedValue(dispatcherSession() as never)
    queryOneMock.mockResolvedValue(null)
    await expect(requireOfficeUser()).rejects.toThrow("REDIRECT:/hub/deactivated")
  })
})

describe("requirePermission active-account guard", () => {
  it("throws for a deactivated account even with a permitted role", async () => {
    authMock.mockResolvedValue(dispatcherSession() as never)
    queryOneMock.mockResolvedValue(null)
    await expect(requirePermission("loads:write")).rejects.toThrow("Account deactivated")
  })

  it("succeeds for an active, permitted account", async () => {
    authMock.mockResolvedValue(dispatcherSession() as never)
    queryOneMock.mockResolvedValue({ id: "u1" })
    const user = await requirePermission("loads:write")
    expect(user.id).toBe("u1")
  })
})

describe("requirePermissionPage active-account guard", () => {
  it("redirects a deactivated account to the deactivated dead end instead of rendering the page", async () => {
    authMock.mockResolvedValue(dispatcherSession() as never)
    queryOneMock.mockResolvedValue(null)
    await expect(requirePermissionPage("loads:write")).rejects.toThrow("REDIRECT:/hub/deactivated")
  })
})
