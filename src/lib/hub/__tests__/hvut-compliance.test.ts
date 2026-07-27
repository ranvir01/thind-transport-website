/**
 * Form 2290 on the compliance wall. The pure half is tested directly (same
 * split as iftaFilingWallEntries) so the calendar behaviour — which period
 * we're in, when it turns amber, when it goes red — is pinned without a
 * database, and the query half is tested for tenancy and for stepping aside
 * when the carrier already tracks it manually.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))

import { query } from "../db"
import { form2290ComplianceEntries, form2290WallEntries, taxPeriodYear } from "../hvut-compliance"

const queryMock = vi.mocked(query)
const CARRIER = "11111111-1111-1111-1111-111111111111"
const fleet = (n: number) => Array.from({ length: n }, (_, i) => ({ unitNumber: `${101 + i}` }))

describe("taxPeriodYear", () => {
  it("opens a new period on July 1", () => {
    expect(taxPeriodYear(new Date("2026-06-30T00:00:00Z"))).toBe(2025)
    expect(taxPeriodYear(new Date("2026-07-01T00:00:00Z"))).toBe(2026)
    expect(taxPeriodYear(new Date("2026-12-31T00:00:00Z"))).toBe(2026)
    expect(taxPeriodYear(new Date("2027-01-01T00:00:00Z"))).toBe(2026)
  })
})

describe("form2290WallEntries", () => {
  it("puts a fifteen-truck fleet on the wall with the amount and the August 31 deadline", () => {
    const [entry] = form2290WallEntries(fleet(15), false, new Date("2026-07-27T00:00:00Z"))
    expect(entry.due).toBe("2026-08-31")
    expect(entry.entity).toBe("company")
    expect(entry.kind).toContain("15 trucks")
    expect(entry.kind).toContain("$8,250.00") // 15 × $550
    expect(entry.kind).toContain("2026-27")
  })

  it("is amber inside 45 days of the deadline and red once it has passed", () => {
    const color = (iso: string) => form2290WallEntries(fleet(3), false, new Date(iso))[0].color
    expect(color("2026-07-02T00:00:00Z")).toBe("green") // 60 days out
    expect(color("2026-07-27T00:00:00Z")).toBe("amber") // 35 days out
    expect(color("2026-08-31T00:00:00Z")).toBe("amber") // due today
    expect(color("2026-09-01T12:00:00Z")).toBe("red") // late
  })

  it("rolls to the next period once July arrives", () => {
    expect(form2290WallEntries(fleet(2), false, new Date("2026-06-15T00:00:00Z"))[0].due).toBe("2025-08-31")
    expect(form2290WallEntries(fleet(2), false, new Date("2026-07-15T00:00:00Z"))[0].due).toBe("2026-08-31")
  })

  it("says nothing when the carrier already tracks 2290 themselves", () => {
    expect(form2290WallEntries(fleet(15), true, new Date("2026-07-27T00:00:00Z"))).toEqual([])
  })

  it("says nothing for a carrier with no trucks", () => {
    expect(form2290WallEntries([], false, new Date("2026-07-27T00:00:00Z"))).toEqual([])
  })

  it("uses the singular for a one-truck operation", () => {
    const [entry] = form2290WallEntries(fleet(1), false, new Date("2026-07-27T00:00:00Z"))
    expect(entry.kind).toContain("1 truck,")
    expect(entry.kind).toContain("$550.00")
  })
})

describe("form2290ComplianceEntries", () => {
  beforeEach(() => queryMock.mockReset())

  it("scopes both reads to the carrier", async () => {
    queryMock.mockResolvedValue([])
    await form2290ComplianceEntries(CARRIER, new Date("2026-07-27T00:00:00Z"))
    expect(queryMock).toHaveBeenCalledTimes(2)
    for (const [sql, params] of queryMock.mock.calls) {
      expect(String(sql)).toContain("carrier_id = $1")
      expect((params as unknown[])[0]).toBe(CARRIER)
    }
  })

  it("looks for an existing manual item only within the current tax period", async () => {
    queryMock.mockResolvedValue([])
    await form2290ComplianceEntries(CARRIER, new Date("2026-07-27T00:00:00Z"))
    const [, params] = queryMock.mock.calls[0]
    expect((params as unknown[])[1]).toBe("2026-07-01")
  })

  it("steps aside when a manual 2290 item already exists", async () => {
    queryMock.mockImplementation(async (sql: string) =>
      String(sql).includes("compliance_items") ? [{ id: "item-1" }] : [{ unit_number: "101" }]
    )
    expect(await form2290ComplianceEntries(CARRIER, new Date("2026-07-27T00:00:00Z"))).toEqual([])
  })

  it("derives the entry from live trucks when nothing tracks it", async () => {
    queryMock.mockImplementation(async (sql: string) =>
      String(sql).includes("compliance_items")
        ? []
        : [{ unit_number: "101" }, { unit_number: "102" }]
    )
    const [entry] = await form2290ComplianceEntries(CARRIER, new Date("2026-07-27T00:00:00Z"))
    expect(entry.kind).toContain("2 trucks")
    expect(entry.kind).toContain("$1,100.00")
    expect(entry.href).toBe("/hub/compliance")
  })

  it("excludes retired and deleted trucks from the count", async () => {
    queryMock.mockResolvedValue([])
    await form2290ComplianceEntries(CARRIER, new Date("2026-07-27T00:00:00Z"))
    const truckSql = String(queryMock.mock.calls[1][0])
    expect(truckSql).toContain("deleted_at IS NULL")
    expect(truckSql).toContain("status <> 'retired'")
  })
})
