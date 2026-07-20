/**
 * setTenantStatusAction (admin-tenancy.test.ts) flips hub.carriers.status to
 * 'suspended', but that update alone did nothing — nobody re-checked carrier
 * status on the request path, so a suspended tenant's office/driver/portal
 * users kept full access for the life of their JWT (~30 days), same gap
 * fixed for per-user `active` (see office/driver/portal-session-active
 * tests). requireOfficeUser, requireDriverUser, requirePortalUser,
 * requirePermission, and requirePermissionPage must all re-check
 * hub.carriers.status = 'active' on every request.
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
import {
  requireDriverUser, requireOfficeUser, requirePermission, requirePermissionPage, requirePortalUser,
} from "../session"

const authMock = vi.mocked(auth)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

function officeSession() {
  return { user: { id: "u1", name: "Dee", email: "dee@dispatch.test", role: "dispatcher", carrierId: CARRIER } }
}
function driverSession() {
  return { user: { id: "u1", name: "Dana", email: "dana@driver.test", role: "driver", carrierId: CARRIER } }
}
function portalSession() {
  return { user: { id: "u1", name: "Bree", email: "bree@broker.test", role: "broker", carrierId: CARRIER } }
}

/** Users-table lookups (per-user `active`) succeed; only carrier status varies. */
function mockQueries(carrierActive: boolean) {
  queryOneMock.mockImplementation(async (sql: unknown) => {
    const text = String(sql)
    if (text.includes("hub.carriers")) return carrierActive ? { id: CARRIER } : null
    if (text.includes("driver_id")) return { driver_id: "drv-1" }
    if (text.includes("customer_id")) return { customer_id: "cust-1" }
    return { id: "u1" }
  })
}

beforeEach(() => {
  authMock.mockReset()
  queryOneMock.mockReset()
})

describe("requireOfficeUser carrier-suspended guard", () => {
  it("bounces office access to /hub/suspended once the carrier is suspended", async () => {
    authMock.mockResolvedValue(officeSession() as never)
    mockQueries(false)
    await expect(requireOfficeUser()).rejects.toThrow("REDIRECT:/hub/suspended")
  })

  it("allows office access while the carrier is active", async () => {
    authMock.mockResolvedValue(officeSession() as never)
    mockQueries(true)
    const user = await requireOfficeUser()
    expect(user.id).toBe("u1")
  })
})

describe("requireDriverUser carrier-suspended guard", () => {
  it("bounces the driver app to /hub/suspended once the carrier is suspended", async () => {
    authMock.mockResolvedValue(driverSession() as never)
    mockQueries(false)
    await expect(requireDriverUser()).rejects.toThrow("REDIRECT:/hub/suspended")
  })
})

describe("requirePortalUser carrier-suspended guard", () => {
  it("bounces the broker/shipper portal to /hub/suspended once the carrier is suspended", async () => {
    authMock.mockResolvedValue(portalSession() as never)
    mockQueries(false)
    await expect(requirePortalUser()).rejects.toThrow("REDIRECT:/hub/suspended")
  })
})

describe("requirePermission carrier-suspended guard", () => {
  it("throws for a suspended carrier even with a permitted role", async () => {
    authMock.mockResolvedValue(officeSession() as never)
    mockQueries(false)
    await expect(requirePermission("loads:write")).rejects.toThrow("Workspace suspended")
  })
})

describe("requirePermissionPage carrier-suspended guard", () => {
  it("redirects to /hub/suspended instead of rendering the page", async () => {
    authMock.mockResolvedValue(officeSession() as never)
    mockQueries(false)
    await expect(requirePermissionPage("loads:write")).rejects.toThrow("REDIRECT:/hub/suspended")
  })
})
