/**
 * Same JWT-vs-active gap fixed for requirePortalUser: login refuses
 * inactive accounts, but hub sessions are JWTs — deactivating a driver did
 * NOT cut off app access until the token expired (~30 days).
 * requireDriverUser must re-check `active` on every request, not just the
 * driver_id linkage.
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
import { requireDriverUser } from "../session"

const authMock = vi.mocked(auth)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

function driverSession() {
  return {
    user: { id: "u1", name: "Dana", email: "dana@driver.test", role: "driver", carrierId: CARRIER },
  }
}

beforeEach(() => {
  authMock.mockReset()
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
})

describe("requireDriverUser active-account guard", () => {
  it("re-checks `active` in the per-request account lookup", async () => {
    authMock.mockResolvedValue(driverSession() as never)
    queryOneMock.mockResolvedValue({ driver_id: "drv-1" })
    const user = await requireDriverUser()
    expect(user.driverId).toBe("drv-1")
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("AND active")
    expect(params).toEqual(["u1", CARRIER])
  })

  it("bounces a deactivated (or unlinked) driver out of the app", async () => {
    authMock.mockResolvedValue(driverSession() as never)
    queryOneMock.mockResolvedValue(null)
    await expect(requireDriverUser()).rejects.toThrow("REDIRECT:/hub/welcome")
  })
})
