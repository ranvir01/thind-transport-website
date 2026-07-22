import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDbAvailable: vi.fn(() => true),
}))

import { query, queryOne, hubDbAvailable } from "../db"
import { countNewWebsiteLeads, saveWebsiteLead, setWebsiteLeadStatus } from "../website-leads"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const availableMock = vi.mocked(hubDbAvailable)

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
    ])
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
    await expect(countNewWebsiteLeads()).resolves.toBe(0)

    queryOneMock.mockResolvedValueOnce({ n: "3" })
    await expect(countNewWebsiteLeads()).resolves.toBe(3)
  })

  it("setWebsiteLeadStatus stamps contacted_at only on the contacted transition", async () => {
    await setWebsiteLeadStatus("7", "contacted")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("CASE WHEN $2 = 'contacted' THEN NOW()")
    expect(params).toEqual(["7", "contacted"])
  })
})
