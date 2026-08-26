import { describe, expect, it } from "vitest"
import { iftaFilingWallEntries } from "../ifta"

// Fixed clocks: 2026-07-06 is inside 2026Q3, so the filing currently due is
// 2026Q2 (due 2026-07-31); 2026-09-15 is past that due date.
const INSIDE_WINDOW = new Date(Date.UTC(2026, 6, 6))
const PAST_DUE = new Date(Date.UTC(2026, 8, 15))

describe("iftaFilingWallEntries", () => {
  it("always surfaces the last completed quarter, amber inside the filing window", () => {
    const entries = iftaFilingWallEntries([], INSIDE_WINDOW)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      entity: "company",
      kind: "IFTA filing 2026Q2",
      due: "2026-07-31",
      color: "amber",
      href: "/hub/compliance/ifta?q=2026Q2",
    })
  })

  it("goes red once the due date passes without a filed report", () => {
    const entries = iftaFilingWallEntries([{ quarter: "2026Q2", status: "draft" }], PAST_DUE)
    expect(entries).toHaveLength(1)
    expect(entries[0].color).toBe("red")
    expect(entries[0].kind).toBe("IFTA filing 2026Q2")
  })

  it("shows green once the current quarter's report is marked filed", () => {
    const entries = iftaFilingWallEntries([{ quarter: "2026Q2", status: "filed" }], INSIDE_WINDOW)
    expect(entries).toHaveLength(1)
    expect(entries[0].color).toBe("green")
  })

  it("keeps flagging older started-but-unfiled quarters red", () => {
    const entries = iftaFilingWallEntries(
      [
        { quarter: "2025Q4", status: "reviewed" },
        { quarter: "2026Q1", status: "filed" },
      ],
      INSIDE_WINDOW
    )
    expect(entries.map((e) => e.kind)).toEqual(["IFTA filing 2025Q4", "IFTA filing 2026Q2"])
    expect(entries[0].color).toBe("red")
    // 2026-01-31 is a Saturday → the real deadline rolls to Monday 2026-02-02.
    expect(entries[0].due).toBe("2026-02-02")
  })

  it("leaves filed past quarters and never-touched pre-onboarding quarters off the wall", () => {
    const entries = iftaFilingWallEntries([{ quarter: "2025Q3", status: "filed" }], INSIDE_WINDOW)
    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe("IFTA filing 2026Q2")
  })

  it("ignores a draft for the still-in-progress quarter", () => {
    const entries = iftaFilingWallEntries([{ quarter: "2026Q3", status: "draft" }], INSIDE_WINDOW)
    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe("IFTA filing 2026Q2")
  })

  // Regression: the wall compared against iftaDueDate(), which is UTC midnight
  // of the due DATE, so it went red ~31 hours before the filing was late.
  it("stays amber through the whole due date and turns red only once it has passed locally", () => {
    const onDueDate = (iso: string) =>
      iftaFilingWallEntries([{ quarter: "2026Q2", status: "draft" }], new Date(iso))[0].color

    expect(onDueDate("2026-07-31T00:00:01Z")).toBe("amber") // start of the due date
    expect(onDueDate("2026-07-31T23:59:00Z")).toBe("amber") // 16:59 local, still on time
    expect(onDueDate("2026-08-01T07:59:00Z")).toBe("amber") // 23:59 local on the 31st
    expect(onDueDate("2026-08-01T08:00:00Z")).toBe("red") // local midnight, now late
  })

  it("respects the weekend roll: 2025Q4 due Mon 2026-02-02, on time through that day locally", () => {
    // 2025-12-31 → last day of month after = Sat 2026-01-31 → rolls to Mon 2026-02-02,
    // so the filing is late only from local midnight into Feb 3 (08:00Z).
    const color = (iso: string) =>
      iftaFilingWallEntries([{ quarter: "2025Q4", status: "draft" }], new Date(iso))[0].color
    expect(color("2026-02-02T12:00:00Z")).toBe("amber")
    expect(color("2026-02-03T07:59:00Z")).toBe("amber")
    expect(color("2026-02-03T08:00:00Z")).toBe("red")
  })

  // Mirrors the load-bearing pattern compliance.test.ts needed for its own
  // 2025Q3 fixture: a report several quarters behind "now" (not just the one
  // directly prior) must still surface, red, on the wall — and the assertion
  // pins the exact entry set so a broken `quarter <= currentQuarter` filter
  // (e.g. one that only looks one quarter back) fails this test instead of
  // passing vacuously off the ever-present current-quarter entry.
  it("still flags a started-but-never-filed quarter from several quarters back, not just the most recent gap", () => {
    const entries = iftaFilingWallEntries(
      [{ quarter: "2025Q3", status: "draft" }],
      INSIDE_WINDOW // current completed quarter is 2026Q2 — three quarters later
    )
    expect(entries.map((e) => e.kind)).toEqual(["IFTA filing 2025Q3", "IFTA filing 2026Q2"])
    expect(entries[0].color).toBe("red")
  })
})
