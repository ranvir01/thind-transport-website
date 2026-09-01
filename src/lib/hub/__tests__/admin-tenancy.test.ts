/**
 * Pins tenancy/role guards on the platform_admin surface (src/app/hub/admin,
 * src/app/hub/_actions/admin.ts) — the one place a single action can name
 * ANY tenant by id, so the isolation property is "only platform_admin, and
 * only the named tenant" rather than the usual "match the caller's own
 * carrier_id". Previously untested (AGENTS.md tenancy doctrine still applies:
 * cross-tenant writes must not be reachable by a tenant-scoped role).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("../session", () => ({ getHubUser: vi.fn(), isActivePlatformAdmin: vi.fn(async () => true) }))

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { getHubUser, isActivePlatformAdmin } from "../session"
import { query } from "../db"
import { logAudit } from "../audit"
import { setTenantStatusAction } from "@/app/hub/_actions/admin"

const getHubUserMock = vi.mocked(getHubUser)
const isActivePlatformAdminMock = vi.mocked(isActivePlatformAdmin)
const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)

const TENANT_A = "11111111-1111-1111-1111-111111111111"
const TENANT_B = "22222222-2222-2222-2222-222222222222"

beforeEach(() => {
  getHubUserMock.mockReset()
  isActivePlatformAdminMock.mockReset()
  isActivePlatformAdminMock.mockResolvedValue(true)
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
  logAuditMock.mockClear()
})

describe("setTenantStatusAction is platform_admin only", () => {
  it("refuses an owner of one tenant trying to suspend another tenant", async () => {
    getHubUserMock.mockResolvedValue({
      id: "u1", name: "Priya", email: "p@a.com", role: "owner", carrierId: TENANT_A,
    })
    const result = await setTenantStatusAction(TENANT_B, "suspended")
    expect(result).toEqual({ ok: false, error: "Platform admins only" })
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("refuses a signed-out caller", async () => {
    getHubUserMock.mockResolvedValue(null)
    const result = await setTenantStatusAction(TENANT_B, "suspended")
    expect(result.ok).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("a platform_admin (no carrier scope of their own) updates exactly the named tenant", async () => {
    getHubUserMock.mockResolvedValue({
      id: "admin1", name: "Ops", email: "ops@platform.com", role: "platform_admin", carrierId: "",
    })
    await setTenantStatusAction(TENANT_B, "suspended")
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("UPDATE hub.carriers SET status = $2")
    expect(String(sql)).toContain("WHERE id = $1")
    expect(params).toEqual([TENANT_B, "suspended"])
  })

  it("attributes the audit entry to the target tenant, not the admin's own scope", async () => {
    getHubUserMock.mockResolvedValue({
      id: "admin1", name: "Ops", email: "ops@platform.com", role: "platform_admin", carrierId: "",
    })
    await setTenantStatusAction(TENANT_B, "active")
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: TENANT_B, actorId: "admin1", entityId: TENANT_B })
    )
  })

  it("refuses a deactivated platform_admin even with a valid role check (JWT-vs-active gap)", async () => {
    getHubUserMock.mockResolvedValue({
      id: "admin1", name: "Ops", email: "ops@platform.com", role: "platform_admin", carrierId: "",
    })
    isActivePlatformAdminMock.mockResolvedValue(false)
    const result = await setTenantStatusAction(TENANT_B, "suspended")
    expect(result).toEqual({ ok: false, error: "Account deactivated" })
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})
