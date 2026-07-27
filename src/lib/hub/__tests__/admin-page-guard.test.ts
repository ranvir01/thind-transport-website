/**
 * TEST_GAPS.md follow-up: requirePlatformAdmin() itself is thoroughly covered
 * (office-session-active.test.ts) and setTenantStatusAction's tenancy is
 * covered (admin-tenancy.test.ts), but nothing asserted that
 * src/app/hub/admin/page.tsx actually calls the guard, or that it calls it
 * BEFORE querying every tenant's row counts. A page that dropped or reordered
 * that line would ship green — the guard's own tests never touch the page,
 * and the page has no other test at all.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/session", () => ({ requirePlatformAdmin: vi.fn() }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))

import { requirePlatformAdmin } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import PlatformAdminPage from "@/app/hub/admin/page"

const requirePlatformAdminMock = vi.mocked(requirePlatformAdmin)
const queryMock = vi.mocked(query)

beforeEach(() => {
  requirePlatformAdminMock.mockReset()
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
})

describe("PlatformAdminPage gates on requirePlatformAdmin", () => {
  it("propagates the guard's rejection and never queries the tenant list", async () => {
    requirePlatformAdminMock.mockRejectedValue(new Error("REDIRECT:/hub"))
    await expect(PlatformAdminPage()).rejects.toThrow("REDIRECT:/hub")
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("only queries tenants once the guard has resolved", async () => {
    requirePlatformAdminMock.mockResolvedValue({
      id: "pa1", name: "Admin", email: "admin@ops.test", role: "platform_admin", carrierId: "",
    })
    await PlatformAdminPage()
    expect(requirePlatformAdminMock).toHaveBeenCalledTimes(1)
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(String(queryMock.mock.calls[0][0])).toContain("FROM hub.carriers c")
  })
})
