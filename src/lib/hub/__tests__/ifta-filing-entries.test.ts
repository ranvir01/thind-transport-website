import { describe, expect, it } from "vitest"
import { iftaFilingWallEntries } from "../ifta"
import { iftaFilingOverdue } from "../ifta-core"

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

  it("stays amber on the due date itself, not red — the filing is on time all day", () => {
    // 2026Q2 is due 2026-07-31. Any moment during that UTC day is still on time.
    const onDueDate = new Date(Date.UTC(2026, 6, 31, 10, 0, 0))
    const entries = iftaFilingWallEntries([{ quarter: "2026Q2", status: "draft" }], onDueDate)
    expect(entries[0]).toMatchObject({ kind: "IFTA filing 2026Q2", color: "amber" })
  })

  it("flips to red at the first instant of the day after the due date", () => {
    const dayAfter = new Date(Date.UTC(2026, 7, 1, 0, 0, 0)) // 2026-08-01T00:00Z
    const entries = iftaFilingWallEntries([{ quarter: "2026Q2", status: "draft" }], dayAfter)
    expect(entries[0].color).toBe("red")
  })
})

describe("iftaFilingOverdue", () => {
  it("is false at the very start of the due date", () => {
    // 2026Q2 due 2026-07-31 → not overdue at 2026-07-31T00:00Z.
    expect(iftaFilingOverdue("2026Q2", new Date(Date.UTC(2026, 6, 31, 0, 0, 0)))).toBe(false)
  })

  it("is false late in the due date (would be true under the old UTC-midnight check)", () => {
    expect(iftaFilingOverdue("2026Q2", new Date(Date.UTC(2026, 6, 31, 23, 59, 0)))).toBe(false)
  })

  it("is true from UTC midnight of the day after the due date", () => {
    expect(iftaFilingOverdue("2026Q2", new Date(Date.UTC(2026, 7, 1, 0, 0, 0)))).toBe(true)
  })

  it("respects the weekend roll: 2025Q4 due Mon 2026-02-02, on time through that day", () => {
    // 2025-12-31 → last day of month after = Sat 2026-01-31 → rolls to Mon 2026-02-02.
    expect(iftaFilingOverdue("2025Q4", new Date(Date.UTC(2026, 1, 2, 12, 0, 0)))).toBe(false)
    expect(iftaFilingOverdue("2025Q4", new Date(Date.UTC(2026, 1, 3, 0, 0, 0)))).toBe(true)
  })
})
