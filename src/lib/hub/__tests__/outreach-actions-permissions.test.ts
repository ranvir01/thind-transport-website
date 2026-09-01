/**
 * Regression (1c tenancy audit, 2026-07-26): all five outreach server actions
 * gated on requireOfficeUser() alone, so an accountant — who holds neither
 * drivers:write nor customers:write in the matrix — could import prospects,
 * overwrite drafts, flip statuses (including mass-unsubscribe), and send cold
 * outreach email in the company's name. Outreach is recruiting work for the
 * driver audience and customer-acquisition work for broker/shipper, so each
 * action now gates on the matching permission. The converted-driver → website
 * lead bridge additionally writes into the operator-owned carrier-less
 * hub.website_leads table, so it must only fire for the operator's tenant.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requireOfficeUser: vi.fn(),
  requirePermission: vi.fn(),
}))
vi.mock("@/lib/hub/outreach/prospects", () => ({
  importProspects: vi.fn(async () => ({ inserted: 1, updated: 0, skipped: 0 })),
  getProspect: vi.fn(),
  saveDraft: vi.fn(async () => undefined),
  setStatus: vi.fn(async () => undefined),
  markSent: vi.fn(async () => undefined),
  suppressByEmail: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/outreach/send", () => ({
  sendOutreachEmail: vi.fn(async () => ({ sent: true })),
}))
vi.mock("@/lib/hub/website-leads", () => ({
  saveWebsiteLead: vi.fn(async () => true),
  OPERATOR_CARRIER_ID: "11111111-1111-1111-1111-111111111111",
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { requireOfficeUser, requirePermission } from "@/lib/hub/session"
import { getProspect, importProspects, saveDraft, setStatus } from "@/lib/hub/outreach/prospects"
import { sendOutreachEmail } from "@/lib/hub/outreach/send"
import { saveWebsiteLead } from "@/lib/hub/website-leads"
import {
  approveAndSendAction, generateDraftAction, importProspectsAction,
  saveDraftAction, setProspectStatusAction,
} from "@/app/hub/_actions/outreach"
import type { Prospect } from "@/lib/hub/outreach/prospects"

const requireOfficeUserMock = vi.mocked(requireOfficeUser)
const requirePermissionMock = vi.mocked(requirePermission)
const getProspectMock = vi.mocked(getProspect)

const OPERATOR = "11111111-1111-1111-1111-111111111111"
const TENANT = "99999999-9999-9999-9999-999999999999"

function sessionUser(role: string, carrierId = TENANT) {
  return { id: "u1", name: "Test User", email: "u@x.test", role, carrierId } as never
}

function prospect(audience: Prospect["audience"]): Prospect {
  return {
    id: "p1", audience, company: "Acme", contact_name: "Sam Doe",
    email: "sam@acme.test", phone: null, mc_number: null, lane: null,
    equipment: null, notes: null, source: null, status: "new",
    draft_channel: null, draft_subject: null, draft_body: null,
    last_contacted_at: null, created_at: "2026-07-01",
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  requirePermissionMock.mockResolvedValue(sessionUser("dispatcher"))
  requireOfficeUserMock.mockResolvedValue(sessionUser("dispatcher"))
  getProspectMock.mockResolvedValue(prospect("driver"))
})

describe("importProspectsAction — permission pinned per audience", () => {
  it("driver audience requires drivers:write", async () => {
    await importProspectsAction("driver", "Sam Doe, sam@x.test")
    expect(requirePermissionMock).toHaveBeenCalledWith("drivers:write")
  })

  it("broker audience requires customers:write", async () => {
    await importProspectsAction("broker", "Acme, sam@x.test")
    expect(requirePermissionMock).toHaveBeenCalledWith("customers:write")
  })

  it("a Forbidden throw from the gate blocks the import", async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden: accountant cannot drivers:write"))
    const res = await importProspectsAction("driver", "Sam Doe, sam@x.test")
    expect(res.ok).toBe(false)
    expect(vi.mocked(importProspects)).not.toHaveBeenCalled()
  })
})

describe("prospect-bound actions — accountant is blocked after the fetch", () => {
  const runs: Array<[string, () => Promise<{ ok: boolean }>, () => number]> = [
    ["generateDraftAction", () => generateDraftAction("p1"), () => vi.mocked(saveDraft).mock.calls.length],
    ["saveDraftAction", () => saveDraftAction("p1", "s", "b"), () => vi.mocked(saveDraft).mock.calls.length],
    ["approveAndSendAction", () => approveAndSendAction("p1"), () => vi.mocked(sendOutreachEmail).mock.calls.length],
    ["setProspectStatusAction", () => setProspectStatusAction("p1", "replied"), () => vi.mocked(setStatus).mock.calls.length],
  ]

  for (const [name, run, mutationCalls] of runs) {
    it(`${name} rejects an accountant and never mutates`, async () => {
      requireOfficeUserMock.mockResolvedValue(sessionUser("accountant"))
      const res = await run()
      expect(res.ok).toBe(false)
      expect((res as { error?: string }).error).toContain("Forbidden")
      expect(mutationCalls()).toBe(0)
    })

    it(`${name} still works for a dispatcher`, async () => {
      const res = await run()
      expect(res.ok).toBe(true)
    })
  }
})

describe("converted-driver → website-lead bridge is operator-only", () => {
  it("does not write the operator's lead board from another tenant", async () => {
    requireOfficeUserMock.mockResolvedValue(sessionUser("dispatcher", TENANT))
    const res = await setProspectStatusAction("p1", "converted")
    expect(res.ok).toBe(true)
    expect(vi.mocked(saveWebsiteLead)).not.toHaveBeenCalled()
  })

  it("still bridges for the operator's own tenant", async () => {
    requireOfficeUserMock.mockResolvedValue(sessionUser("dispatcher", OPERATOR))
    const res = await setProspectStatusAction("p1", "converted")
    expect(res.ok).toBe(true)
    expect(vi.mocked(saveWebsiteLead)).toHaveBeenCalledTimes(1)
  })
})
