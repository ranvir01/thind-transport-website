import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))

import { query } from "../db"
import { addComplianceItem, complianceEntries, resolveComplianceItem, summarize } from "../compliance"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"

function mockRowsBySql(rows: {
  drivers?: unknown[]
  trucks?: unknown[]
  maintenance?: unknown[]
  manual?: unknown[]
}) {
  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("FROM hub.drivers")) return rows.drivers ?? []
    if (s.includes("FROM hub.maintenance_schedules")) return rows.maintenance ?? []
    if (s.includes("FROM hub.trucks")) return rows.trucks ?? []
    if (s.includes("FROM hub.compliance_items")) return rows.manual ?? []
    return []
  })
}

describe("complianceEntries color thresholds (colorFor)", () => {
  beforeEach(() => queryMock.mockReset())

  it("colors a past due date red, a date inside 30 days amber, and a far-out date green", async () => {
    const now = Date.now()
    const past = new Date(now - 86400000).toISOString().slice(0, 10)
    const soon = new Date(now + 10 * 86400000).toISOString().slice(0, 10)
    const far = new Date(now + 90 * 86400000).toISOString().slice(0, 10)
    mockRowsBySql({
      drivers: [
        { id: "d1", name: "Red Driver", cdl_expiry: past, medical_card_expiry: far },
        { id: "d2", name: "Amber Driver", cdl_expiry: soon, medical_card_expiry: far },
      ],
    })
    const entries = await complianceEntries(CARRIER)
    const cdlRed = entries.find((e) => e.entityId === "d1" && e.kind === "CDL")
    const cdlAmber = entries.find((e) => e.entityId === "d2" && e.kind === "CDL")
    const medGreen = entries.find((e) => e.entityId === "d1" && e.kind === "Medical card")
    expect(cdlRed?.color).toBe("red")
    expect(cdlAmber?.color).toBe("amber")
    expect(medGreen?.color).toBe("green")
  })

  it("treats a missing driver/truck due date as amber (needs attention)", async () => {
    mockRowsBySql({
      drivers: [{ id: "d1", name: "No Card", cdl_expiry: null, medical_card_expiry: null }],
    })
    const entries = await complianceEntries(CARRIER)
    expect(entries.every((e) => e.color === "amber")).toBe(true)
  })

  it("treats a manual company item with no due date as green, not amber", async () => {
    mockRowsBySql({
      manual: [{ id: "item-1", kind: "IFTA decals", due_on: null, note: null }],
    })
    const entries = await complianceEntries(CARRIER)
    expect(entries).toHaveLength(1)
    expect(entries[0].color).toBe("green")
    expect(entries[0].manualItemId).toBe("item-1")
  })

  it("sorts red before amber before green, ties broken by earliest due date", async () => {
    const now = Date.now()
    const past2 = new Date(now - 2 * 86400000).toISOString().slice(0, 10)
    const past1 = new Date(now - 1 * 86400000).toISOString().slice(0, 10)
    const far = new Date(now + 90 * 86400000).toISOString().slice(0, 10)
    mockRowsBySql({
      drivers: [
        { id: "d1", name: "Driver A", cdl_expiry: far, medical_card_expiry: null },
        { id: "d2", name: "Driver B", cdl_expiry: past1, medical_card_expiry: null },
      ],
      manual: [{ id: "item-1", kind: "2290", due_on: past2, note: null }],
    })
    const entries = await complianceEntries(CARRIER)
    // Both past1 (d2 CDL) and past2 (item-1) are red; item-1's due is earlier so it sorts first.
    const redEntries = entries.filter((e) => e.color === "red")
    expect(redEntries[0].kind).toBe("2290")
    expect(redEntries[1].kind).toBe("CDL")
    expect(entries[entries.length - 1].color).not.toBe("red")
  })
})

describe("complianceEntries carrier scoping", () => {
  beforeEach(() => queryMock.mockReset())

  it("scopes every underlying query to the given carrier_id", async () => {
    mockRowsBySql({})
    await complianceEntries(CARRIER)
    for (const [sql, params] of queryMock.mock.calls) {
      expect(String(sql)).toContain("carrier_id = $1")
      expect(params).toEqual([CARRIER])
    }
    expect(queryMock).toHaveBeenCalledTimes(4)
  })

  it("excludes soft-deleted drivers/trucks and inactive/retired records", async () => {
    mockRowsBySql({})
    await complianceEntries(CARRIER)
    const driverSql = String(queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.drivers"))![0])
    const truckSql = String(queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.trucks"))![0])
    expect(driverSql).toContain("deleted_at IS NULL AND status = 'active'")
    expect(truckSql).toContain("deleted_at IS NULL AND status <> 'retired'")
  })

  it("only pulls open, company-level manual items", async () => {
    mockRowsBySql({})
    await complianceEntries(CARRIER)
    const manualSql = String(queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.compliance_items"))![0])
    expect(manualSql).toContain("status = 'open'")
    expect(manualSql).toContain("entity_type = 'company'")
  })
})

describe("addComplianceItem / resolveComplianceItem", () => {
  beforeEach(() => queryMock.mockReset())

  it("inserts a company-level item scoped to the carrier", async () => {
    queryMock.mockResolvedValue([])
    await addComplianceItem(CARRIER, { kind: "UCR", dueOn: "2026-12-31", note: "annual" })
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("INSERT INTO hub.compliance_items")
    expect(String(sql)).toContain("'company'")
    expect(params).toEqual([CARRIER, "UCR", "2026-12-31", "annual"])
  })

  it("resolveComplianceItem scopes the update by carrier_id AND id (both-sides tenancy)", async () => {
    queryMock.mockResolvedValue([])
    await resolveComplianceItem(CARRIER, "item-1")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("carrier_id = $1 AND id = $2")
    expect(params).toEqual([CARRIER, "item-1"])
  })
})

describe("summarize", () => {
  it("counts entries per color bucket", () => {
    const entries = [
      { color: "red" }, { color: "red" }, { color: "amber" }, { color: "green" }, { color: "green" }, { color: "green" },
    ] as Parameters<typeof summarize>[0]
    expect(summarize(entries)).toEqual({ red: 2, amber: 1, green: 3 })
  })

  it("returns all zeros for no entries", () => {
    expect(summarize([])).toEqual({ red: 0, amber: 0, green: 0 })
  })
})
