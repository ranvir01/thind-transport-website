/**
 * getActiveHubUser (src/lib/hub/session.ts) is the guard route handlers use
 * instead of bare getHubUser. Sessions are ~30-day JWTs, so "signed in" says
 * nothing about current DB state: a user deactivated in user management, or a
 * whole tenant suspended by setTenantStatusAction, kept bulk data egress
 * through /api/hub exports, IFTA files, statement PDFs, stored documents,
 * notifications and push for the token's lifetime — while every page and
 * server action correctly blocked them. This suite pins the re-checks.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { authMock, queryOneMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  queryOneMock: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: authMock }))
vi.mock("../db", () => ({ queryOne: queryOneMock, query: vi.fn() }))

import { getActiveHubUser } from "../session"

const CARRIER = "11111111-1111-1111-1111-111111111111"

function signedInAs(role: string, carrierId: string | null = CARRIER) {
  authMock.mockResolvedValue({
    user: { id: "u1", name: "Test", email: "t@thind.test", role, carrierId },
  })
}

/** Route queryOne by the table each re-check hits, not by call order. */
function dbState({ userActive, carrierActive, adminActive }: {
  userActive?: boolean
  carrierActive?: boolean
  adminActive?: boolean
}) {
  queryOneMock.mockImplementation(async (sql: string) => {
    if (sql.includes("hub.carriers")) return carrierActive ? { id: CARRIER } : null
    if (sql.includes("role = 'platform_admin'")) return adminActive ? { id: "u1" } : null
    if (sql.includes("hub.users")) return userActive ? { id: "u1" } : null
    throw new Error(`unexpected query: ${sql}`)
  })
}

beforeEach(() => {
  authMock.mockReset()
  queryOneMock.mockReset()
})

describe("getActiveHubUser", () => {
  it("returns null with no session, without touching the DB", async () => {
    authMock.mockResolvedValue(null)
    expect(await getActiveHubUser()).toBeNull()
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("returns the user when both the account and the carrier are active", async () => {
    signedInAs("owner")
    dbState({ userActive: true, carrierActive: true })
    const user = await getActiveHubUser()
    expect(user?.id).toBe("u1")
    expect(user?.carrierId).toBe(CARRIER)
  })

  it("returns null for a deactivated account despite a valid JWT", async () => {
    signedInAs("owner")
    dbState({ userActive: false, carrierActive: true })
    expect(await getActiveHubUser()).toBeNull()
  })

  it("returns null when the tenant is suspended, even for an active user", async () => {
    signedInAs("dispatcher")
    dbState({ userActive: true, carrierActive: false })
    expect(await getActiveHubUser()).toBeNull()
  })

  it("re-checks drivers and portal roles the same way", async () => {
    signedInAs("driver")
    dbState({ userActive: false, carrierActive: true })
    expect(await getActiveHubUser()).toBeNull()
  })

  it("platform_admin passes via its own role re-check (no carrier to check)", async () => {
    signedInAs("platform_admin", null)
    dbState({ adminActive: true })
    const user = await getActiveHubUser()
    expect(user?.role).toBe("platform_admin")
    expect(queryOneMock).toHaveBeenCalledTimes(1)
  })

  it("returns null for a deactivated platform_admin", async () => {
    signedInAs("platform_admin", null)
    dbState({ adminActive: false })
    expect(await getActiveHubUser()).toBeNull()
  })
})
