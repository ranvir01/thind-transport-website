/**
 * Portal-subsystem audit: login refuses inactive accounts, but hub sessions
 * are JWTs — deactivating an external broker/shipper did NOT cut off portal
 * access until the token expired (~30 days). requirePortalUser must re-check
 * `active` on every request, not just customer linkage.
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
import { requirePortalUser } from "../session"

const authMock = vi.mocked(auth)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

function brokerSession() {
  return {
    user: { id: "u1", name: "Bree", email: "bree@broker.test", role: "broker", carrierId: CARRIER },
  }
}

beforeEach(() => {
  authMock.mockReset()
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
})

describe("requirePortalUser active-account guard", () => {
  it("re-checks `active` in the per-request account lookup", async () => {
    authMock.mockResolvedValue(brokerSession() as never)
    queryOneMock.mockResolvedValue({ customer_id: "cust-1" })
    const user = await requirePortalUser()
    expect(user.customerId).toBe("cust-1")
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("AND active")
    expect(params).toEqual(["u1", CARRIER])
  })

  it("bounces a deactivated (or unlinked) account out of the portal", async () => {
    authMock.mockResolvedValue(brokerSession() as never)
    queryOneMock.mockResolvedValue(null)
    await expect(requirePortalUser()).rejects.toThrow("REDIRECT:/hub/welcome")
  })
})
