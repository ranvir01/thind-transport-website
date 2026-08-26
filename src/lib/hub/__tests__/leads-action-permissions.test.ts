/**
 * Regression (1c tenancy audit, 2026-07-26): setLeadStatusAction called
 * setWebsiteLeadStatus(id, status) with no carrier — the UPDATE matched by
 * raw bigint id on the operator-owned, carrier-less hub.website_leads table,
 * so any tenant's office user could mass-close the site operator's driver
 * leads (and only requireOfficeUser gated it, letting an accountant do it
 * too). The action now pins drivers:write like promoteLeadAction and passes
 * the session carrier into the operator-guarded data layer.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({
    id: "u1", name: "Dispatcher", email: "d@x.test", role: "dispatcher", carrierId: "carrier-1",
  })),
}))
vi.mock("@/lib/hub/website-leads", () => ({ setWebsiteLeadStatus: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/recruiting", () => ({ promoteWebsiteLead: vi.fn(async () => ({ ok: true, applicantId: "a1" })) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { requirePermission } from "@/lib/hub/session"
import { setWebsiteLeadStatus } from "@/lib/hub/website-leads"
import { promoteWebsiteLead } from "@/lib/hub/recruiting"
import { promoteLeadAction, setLeadStatusAction } from "@/app/hub/_actions/leads"

const requirePermissionMock = vi.mocked(requirePermission)

beforeEach(() => vi.clearAllMocks())

describe("leads.ts server actions — permission + carrier plumbed to the data layer", () => {
  it("setLeadStatusAction requires drivers:write and passes the session carrier", async () => {
    const res = await setLeadStatusAction("7", "contacted")
    expect(res.ok).toBe(true)
    expect(requirePermissionMock).toHaveBeenCalledWith("drivers:write")
    expect(vi.mocked(setWebsiteLeadStatus)).toHaveBeenCalledWith("carrier-1", "7", "contacted")
  })

  it("setLeadStatusAction surfaces a Forbidden throw as ok:false without writing", async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden: accountant cannot drivers:write"))
    const res = await setLeadStatusAction("7", "closed")
    expect(res.ok).toBe(false)
    expect(vi.mocked(setWebsiteLeadStatus)).not.toHaveBeenCalled()
  })

  it("promoteLeadAction keeps drivers:write and the carrier-scoped promote", async () => {
    const res = await promoteLeadAction("7")
    expect(res.ok).toBe(true)
    expect(requirePermissionMock).toHaveBeenCalledWith("drivers:write")
    expect(vi.mocked(promoteWebsiteLead)).toHaveBeenCalledWith("carrier-1", "7", "Dispatcher")
  })
})
