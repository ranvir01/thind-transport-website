/**
 * arAgingTrendCsv was the one AR aging panel piece with no CSV export at all
 * (every other owner-dashboard trend/table already had one — fuel spend,
 * lanes, per-truck P&L). Covers the header/row shape, dollar formatting, the
 * weeks-based filename, and the empty-book case.
 */
import { describe, expect, it } from "vitest"
import { arAgingTrendCsv } from "../reports"
import type { AgingTrendPeriod } from "../reports"

const period = (overrides: Partial<AgingTrendPeriod> = {}): AgingTrendPeriod => ({
  periodStart: "2026-06-01",
  currentCents: 120000,
  bucket1_30Cents: 45000,
  bucket31_60Cents: 0,
  bucket61_90Cents: 0,
  bucket90PlusCents: 0,
  totalOpenCents: 165000,
  ...overrides,
})

describe("arAgingTrendCsv", () => {
  it("names the file after the week count", () => {
    expect(arAgingTrendCsv([], 8).filename).toBe("ar-aging-trend_last-8-weeks.csv")
    expect(arAgingTrendCsv([], 26).filename).toBe("ar-aging-trend_last-26-weeks.csv")
  })

  it("emits a header row plus one row per checkpoint with dollar-formatted buckets", () => {
    const { csv } = arAgingTrendCsv([period()], 8)
    const [header, dataRow] = csv.split("\n")
    expect(header).toBe("WeekOf,Current,1-30,31-60,61-90,90+,TotalOpen")
    expect(dataRow).toBe("2026-06-01,1200.00,450.00,0.00,0.00,0.00,1650.00")
  })

  it("returns just the header for a book with no aging history", () => {
    const { csv } = arAgingTrendCsv([], 8)
    expect(csv).toBe("WeekOf,Current,1-30,31-60,61-90,90+,TotalOpen")
  })

  it("emits one row per checkpoint in the order given", () => {
    const { csv } = arAgingTrendCsv(
      [period({ periodStart: "2026-05-25" }), period({ periodStart: "2026-06-01", totalOpenCents: 0, currentCents: 0, bucket1_30Cents: 0 })],
      8
    )
    const lines = csv.split("\n")
    expect(lines).toHaveLength(3)
    expect(lines[1].startsWith("2026-05-25,")).toBe(true)
    expect(lines[2]).toBe("2026-06-01,0.00,0.00,0.00,0.00,0.00,0.00")
  })
})
