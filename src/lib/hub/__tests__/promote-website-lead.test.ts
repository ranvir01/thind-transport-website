/**
 * Website lead → recruiting pipeline promotion (promoteWebsiteLead +
 * promoteLeadAction). The rules under test:
 *   1. Tenant guard — hub.website_leads is pre-tenant marketing-site data, so
 *      only the site operator's carrier (Thind) may promote; every other
 *      tenant is refused before any query runs (same doctrine as
 *      importPublicApplicants).
 *   2. Idempotency — the bridge id `website-lead:<id>` rides the
 *      (carrier_id, public_application_id) unique index; a repeat tap reports
 *      an error instead of duplicating the applicant, and does NOT close the
 *      lead again.
 *   3. Field mapping — one free-text name splits into first/last (email
 *      local part when the name is missing), "5+" experience parses to 5,
 *      and the lead is closed only after the applicant exists.
 *   4. Action gate — promoteLeadAction requires drivers:write like every
 *      other applicant mutation, and audits the promotion.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  hubDb: vi.fn(),
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDbAvailable: vi.fn(() => true),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/session", () => ({
  requireOfficeUser: vi.fn(),
  requirePermission: vi.fn(),
}))

import { query, queryOne } from "../db"
import { promoteWebsiteLead } from "../recruiting"
import { promoteLeadAction } from "@/app/hub/_actions/leads"
import { requirePermission } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const requirePermissionMock = vi.mocked(requirePermission)

const THIND = "11111111-1111-1111-1111-111111111111"

const LEAD = {
  id: "7",
  name: "Jasdeep Singh Gill",
  email: "jasdeep@example.com",
  phone: "2065551234",
  source: "Application Form Step 2",
  driver_type: "owner-operator-otr",
  experience_years: "5+",
  message: "Looking for regional work",
  status: "new" as const,
  created_at: "2026-07-25T00:00:00Z",
  contacted_at: null,
}

/** query() answers the applicants INSERT with `row`, everything else with []. */
function applicantInsertReturns(row: { id: string } | null) {
  queryMock.mockImplementation(async (sql: unknown) => {
    if (String(sql).includes("INSERT INTO hub.applicants")) return row ? [row] : []
    return []
  })
}

beforeEach(() => {
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
  requirePermissionMock.mockReset()
  vi.mocked(logAudit).mockClear()
})

describe("promoteWebsiteLead — tenant guard", () => {
  it("refuses every carrier except the site operator, before any query", async () => {
    const result = await promoteWebsiteLead("22222222-2222-2222-2222-222222222222", "7", "Maya")
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/site operator/i)
    expect(queryMock).not.toHaveBeenCalled()
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("reports a missing lead instead of inserting a ghost applicant", async () => {
    queryOneMock.mockResolvedValueOnce(null)
    const result = await promoteWebsiteLead(THIND, "999", "Maya")
    expect(result).toEqual({ ok: false, error: "Lead not found" })
    expect(queryMock).not.toHaveBeenCalled()
  })
})

describe("promoteWebsiteLead — field mapping + lead closure", () => {
  it("maps the lead onto an applicant and closes the lead afterwards", async () => {
    queryOneMock.mockResolvedValueOnce(LEAD)
    applicantInsertReturns({ id: "app-1" })

    const result = await promoteWebsiteLead(THIND, "7", "Maya")
    expect(result).toEqual({ ok: true, applicantId: "app-1" })

    const insert = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO hub.applicants")
    )
    expect(insert).toBeDefined()
    const params = insert![1] as unknown[]
    // [carrierId, source, firstName, lastName, phone, email, cdl, cdlState, years, notes, application, publicApplicationId, orientation]
    expect(params[0]).toBe(THIND)
    expect(params[1]).toBe("public_site")
    expect(params[2]).toBe("Jasdeep")
    expect(params[3]).toBe("Singh Gill")
    expect(params[4]).toBe("2065551234")
    expect(params[5]).toBe("jasdeep@example.com")
    expect(params[8]).toBe(5) // "5+" → 5
    expect(String(params[9])).toContain("owner-operator-otr")
    expect(String(params[9])).toContain("Looking for regional work")
    expect(params[11]).toBe("website-lead:7")

    const close = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("UPDATE hub.website_leads")
    )
    expect(close).toBeDefined()
    expect(close![1]).toEqual(["7", "closed"])
  })

  it("falls back to the email local part when the lead never gave a name", async () => {
    queryOneMock.mockResolvedValueOnce({ ...LEAD, name: null, experience_years: "no CDL yet" })
    applicantInsertReturns({ id: "app-2" })

    const result = await promoteWebsiteLead(THIND, "7", "Maya")
    expect(result.ok).toBe(true)
    const params = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO hub.applicants")
    )![1] as unknown[]
    expect(params[2]).toBe("jasdeep")
    expect(params[3]).toBe("(website lead)")
    expect(params[8]).toBeNull() // no digits in experience text
  })

  it("repeat tap: reports already-promoted and does NOT close the lead again", async () => {
    queryOneMock.mockResolvedValueOnce(LEAD)
    applicantInsertReturns(null) // ON CONFLICT DO NOTHING → no row back

    const result = await promoteWebsiteLead(THIND, "7", "Maya")
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already in the recruiting pipeline/i)
    const close = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("UPDATE hub.website_leads")
    )
    expect(close).toBeUndefined()
  })
})

describe("promoteLeadAction — permission gate + audit", () => {
  it("requires drivers:write and refuses when the role lacks it", async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden"))
    const result = await promoteLeadAction("7")
    expect(requirePermissionMock).toHaveBeenCalledWith("drivers:write")
    expect(result.ok).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("promotes and audits as lead_promoted when permitted", async () => {
    requirePermissionMock.mockResolvedValueOnce({
      id: "u1", name: "Maya", carrierId: THIND, role: "dispatcher",
    } as never)
    queryOneMock.mockResolvedValueOnce(LEAD)
    applicantInsertReturns({ id: "app-3" })

    const result = await promoteLeadAction("7")
    expect(result).toEqual({ ok: true, applicantId: "app-3" })
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "website_lead", entityId: "7", action: "lead_promoted" })
    )
  })

  it("does not audit a refused promotion (wrong tenant)", async () => {
    requirePermissionMock.mockResolvedValueOnce({
      id: "u2", name: "Cascade Owner", carrierId: "22222222-2222-2222-2222-222222222222", role: "owner",
    } as never)
    const result = await promoteLeadAction("7")
    expect(result.ok).toBe(false)
    expect(logAudit).not.toHaveBeenCalled()
  })
})
