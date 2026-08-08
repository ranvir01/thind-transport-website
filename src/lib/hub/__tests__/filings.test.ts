/**
 * MCS-150 / UCR derived filings (research wave 2, prompt-12).
 *
 * The anchor case is the real fleet: USDOT 2523064 ends in 4 (April) with
 * next-to-last digit 6 (even years), so its MCS-150 was due 2026-04-30 —
 * which is exactly the overdue-check the research surfaced. If the
 * derivation here drifts, the wall goes quiet about a filing whose penalty
 * is USDOT deactivation.
 */
import { describe, expect, it, vi } from "vitest"
import { mcs150Cycle, mcs150Month, mcs150WallEntries, mcs150YearParity, ucrWallEntries } from "../filings"

const AUG_2026 = new Date("2026-08-08T12:00:00Z")

describe("mcs150 derivation (49 CFR 390.19)", () => {
  it("reads month and parity out of the USDOT number", () => {
    expect(mcs150Month("2523064")).toBe(4)
    expect(mcs150YearParity("2523064")).toBe(0)
    expect(mcs150Month("1000000")).toBe(10) // 0 = October, never Nov/Dec
    expect(mcs150Month("123")).toBe(3)
    expect(mcs150YearParity("133")).toBe(1)
  })

  it("treats a single-digit number as even-year filing", () => {
    expect(mcs150YearParity("7")).toBe(0)
  })

  it("returns null rather than guessing on unusable input", () => {
    expect(mcs150Month("")).toBeNull()
    expect(mcs150Month("USDOT-pending")).toBeNull()
    expect(mcs150Cycle("", AUG_2026)).toBeNull()
  })

  it("finds the fleet's real cycle: April of even years", () => {
    expect(mcs150Cycle("2523064", AUG_2026)).toEqual({
      lastDue: "2026-04-30", nextDue: "2028-04-30", month: 4,
    })
  })

  it("odd parity lands on odd years", () => {
    expect(mcs150Cycle("2523074", AUG_2026)).toEqual({
      lastDue: "2025-04-30", nextDue: "2027-04-30", month: 4,
    })
  })

  it("February cycles respect leap years", () => {
    const cycle = mcs150Cycle("2523082", AUG_2026) // 2 = Feb, 8 = even
    expect(cycle).toEqual({ lastDue: "2026-02-28", nextDue: "2028-02-29", month: 2 })
  })

  it("a due date later this year stays in the previous cycle until it passes", () => {
    // Month 9 (September), even years: at Aug 2026 the Sep 2026 date hasn't
    // arrived, so the most recent DUE date is Sep 2024.
    expect(mcs150Cycle("2523069", AUG_2026)?.lastDue).toBe("2024-09-30")
  })
})

describe("mcs150 wall entries", () => {
  it("shows the untracked current cycle red as a verify item", () => {
    const entries = mcs150WallEntries("2523064", [], AUG_2026)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      entity: "company", due: "2026-04-30", color: "red", href: "/hub/compliance",
    })
    expect(entries[0]!.kind).toContain("MCS-150")
    expect(entries[0]!.kind).toContain("verify")
  })

  it("steps aside once the office records the filing (null due date counts)", () => {
    expect(mcs150WallEntries("2523064", [null], AUG_2026)).toEqual([])
    expect(mcs150WallEntries("2523064", ["2026-05-02"], AUG_2026)).toEqual([])
  })

  it("gives the next cycle a 90-day amber runway once the current one is recorded", () => {
    const feb2028 = new Date("2028-02-15T12:00:00Z")
    const entries = mcs150WallEntries("2523064", ["2026-05-02"], feb2028)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ due: "2028-04-30", color: "amber" })
    // …and stays quiet while the next date is still far out.
    expect(mcs150WallEntries("2523064", ["2026-05-02"], new Date("2027-06-01T00:00:00Z"))).toEqual([])
  })

  it("emits nothing without a USDOT number — no fabricated obligations", () => {
    expect(mcs150WallEntries(null, [], AUG_2026)).toEqual([])
  })
})

describe("ucr wall entries", () => {
  it("shows the in-force year's registration as a red verify item when untracked", () => {
    const entries = ucrWallEntries([], AUG_2026)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ due: "2025-12-31", color: "red" })
    expect(entries[0]!.kind).toContain("verify 2026")
  })

  it("steps aside when a UCR item exists for that window", () => {
    expect(ucrWallEntries(["2025-11-15"], AUG_2026)).toEqual([])
    expect(ucrWallEntries([null], AUG_2026)).toEqual([])
  })

  it("opens the next year's window on Oct 1 and ambers inside 45 days", () => {
    const nov = ucrWallEntries(["2025-11-15"], new Date("2026-11-01T12:00:00Z"))
    expect(nov).toHaveLength(1)
    expect(nov[0]).toMatchObject({ due: "2026-12-31", color: "green" })
    expect(nov[0]!.kind).toContain("UCR 2027")

    const dec = ucrWallEntries(["2025-11-15"], new Date("2026-12-15T12:00:00Z"))
    expect(dec[0]).toMatchObject({ due: "2026-12-31", color: "amber" })
  })

  it("can show both the missed verify and the open window at once", () => {
    const entries = ucrWallEntries([], new Date("2026-11-01T12:00:00Z"))
    expect(entries.map((e) => e.due)).toEqual(["2025-12-31", "2026-12-31"])
  })
})

describe("filingsComplianceEntries (database half)", () => {
  it("scopes every query to the carrier and hands rows to the pure half", async () => {
    vi.resetModules()
    const queryMock = vi.fn(async (_sql: string, _params?: unknown[]) => [] as { due_on: string | null }[])
    const queryOneMock = vi.fn(async (_sql: string, _params?: unknown[]) => ({ dot_number: "2523064" }))
    vi.doMock("../db", () => ({ query: queryMock, queryOne: queryOneMock }))
    const { filingsComplianceEntries } = await import("../filings-compliance")

    const entries = await filingsComplianceEntries("carrier-1", AUG_2026)

    // Untracked MCS-150 (red, 2026-04-30) + untracked UCR verify (red).
    expect(entries.map((e) => e.due)).toEqual(["2026-04-30", "2025-12-31"])
    // The carriers row is fetched by its own primary key…
    expect(String(queryOneMock.mock.calls[0]?.[0])).toContain("WHERE id = $1")
    // …and every compliance_items probe is tenant-scoped.
    expect(queryMock.mock.calls.length).toBe(2)
    for (const call of queryMock.mock.calls) {
      expect(String(call[0])).toContain("carrier_id = $1")
      expect(call[1]).toEqual(["carrier-1"])
    }
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual(["carrier-1"])
    vi.doUnmock("../db")
  })
})
