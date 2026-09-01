import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db-available", () => ({
  hubDbAvailable: vi.fn(() => true),
}))
vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "../db"
import { hubDbAvailable } from "../db-available"
import {
  OPERATOR_CARRIER_ID, countNewWebsiteLeads, getWebsiteLead, listWebsiteLeads,
  saveWebsiteLead, setWebsiteLeadStatus,
} from "../website-leads"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const availableMock = vi.mocked(hubDbAvailable)

const FOREIGN_CARRIER = "99999999-9999-9999-9999-999999999999"

describe("website leads — the lead can never be lost silently", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
    queryOneMock.mockReset()
    availableMock.mockReturnValue(true)
  })

  it("saveWebsiteLead inserts every field and reports success", async () => {
    const ok = await saveWebsiteLead({
      name: "Test Driver", email: "d@example.com", phone: "2065551234",
      source: "Application Form Step 2", driverType: "owner-operator-otr",
      experienceYears: "5+", message: null,
    })
    expect(ok).toBe(true)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("INSERT INTO hub.website_leads")
    expect(params).toEqual([
      "Test Driver", "d@example.com", "2065551234",
      "Application Form Step 2", "owner-operator-otr", "5+", null,
      null, // attribution — this fixture is direct traffic
    ])
  })

  it("stores attribution as JSON when the visit carried a campaign", async () => {
    // The whole point of the column: `source` says which form they filled in,
    // attribution says what brought them to the site.
    queryMock.mockClear()
    await saveWebsiteLead({
      email: "d@example.com",
      source: "Application Form Step 2",
      attribution: { utm_source: "google", utm_medium: "cpc", landing: "/drivers" },
    })
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("attribution")
    expect(params).toBeDefined()
    expect(JSON.parse(params![7] as string)).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      landing: "/drivers",
    })
  })

  it("saveWebsiteLead returns false (never throws) on DB failure or no DB", async () => {
    queryMock.mockRejectedValueOnce(new Error("relation does not exist"))
    await expect(saveWebsiteLead({ email: "d@example.com" })).resolves.toBe(false)

    availableMock.mockReturnValue(false)
    await expect(saveWebsiteLead({ email: "d@example.com" })).resolves.toBe(false)
    expect(queryMock).toHaveBeenCalledTimes(1)
  })

  it("countNewWebsiteLeads returns 0 on a pre-migration DB instead of crashing Today", async () => {
    queryOneMock.mockRejectedValueOnce(new Error("relation does not exist"))
    await expect(countNewWebsiteLeads(OPERATOR_CARRIER_ID)).resolves.toBe(0)

    queryOneMock.mockResolvedValueOnce({ n: "3" })
    await expect(countNewWebsiteLeads(OPERATOR_CARRIER_ID)).resolves.toBe(3)
  })

  it("setWebsiteLeadStatus stamps contacted_at only on the contacted transition", async () => {
    await setWebsiteLeadStatus(OPERATOR_CARRIER_ID, "7", "contacted")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("CASE WHEN $2 = 'contacted' THEN NOW()")
    expect(params).toEqual(["7", "contacted"])
  })
})

/**
 * Regression (1c tenancy audit, 2026-07-26): hub.website_leads is the site
 * operator's own carrier-less table, but the operator-only invariant lived in
 * exactly one caller (promoteWebsiteLead). setLeadStatusAction let ANY
 * tenant's office user close the operator's leads by raw bigint id, and the
 * leads page / Today card rendered the operator's full lead book (recruiting
 * PII) to every tenant. The guard now lives at the data layer: every read
 * returns empty and the mutation throws for any carrier but the operator's.
 */
describe("website leads — operator-only scoping at the data layer", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
    queryOneMock.mockReset()
    queryOneMock.mockResolvedValue(null)
  })

  it("listWebsiteLeads returns empty for a non-operator carrier without querying", async () => {
    await expect(listWebsiteLeads(FOREIGN_CARRIER)).resolves.toEqual([])
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("getWebsiteLead returns null for a non-operator carrier without querying", async () => {
    await expect(getWebsiteLead(FOREIGN_CARRIER, "7")).resolves.toBeNull()
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("countNewWebsiteLeads returns 0 for a non-operator carrier without querying", async () => {
    await expect(countNewWebsiteLeads(FOREIGN_CARRIER)).resolves.toBe(0)
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("setWebsiteLeadStatus throws for a non-operator carrier and writes nothing", async () => {
    await expect(setWebsiteLeadStatus(FOREIGN_CARRIER, "7", "closed")).rejects.toThrow(
      "Website leads belong to the site operator"
    )
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("operator reads still hit the table", async () => {
    await listWebsiteLeads(OPERATOR_CARRIER_ID)
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(String(queryMock.mock.calls[0][0])).toContain("FROM hub.website_leads")
  })
})
