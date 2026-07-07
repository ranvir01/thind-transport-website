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
    expect(entries[0].due).toBe("2026-01-31")
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
})
