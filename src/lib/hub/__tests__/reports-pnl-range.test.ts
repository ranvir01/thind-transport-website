import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { parseStoredPnlRange, pnlPresetRanges, resolvePnlRange, truckPnlRangeCsv } from "@/lib/hub/reports"
import type { TruckPnl } from "@/lib/hub/expenses"

describe("resolvePnlRange", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("passes through a valid from/to pair unchanged", () => {
    expect(resolvePnlRange("2026-01-01", "2026-03-31")).toEqual({ from: "2026-01-01", to: "2026-03-31" })
  })

  it("defaults to the trailing 92 days ending today when both params are missing", () => {
    expect(resolvePnlRange(undefined, undefined)).toEqual({ from: "2026-04-13", to: "2026-07-14" })
  })

  it("defaults only the missing end when one param is valid", () => {
    expect(resolvePnlRange("2026-06-01", undefined)).toEqual({ from: "2026-06-01", to: "2026-07-14" })
    expect(resolvePnlRange(undefined, "2026-06-01")).toEqual({ from: "2026-04-13", to: "2026-06-01" })
  })

  it("swaps a backwards range instead of erroring", () => {
    expect(resolvePnlRange("2026-06-01", "2026-01-01")).toEqual({ from: "2026-01-01", to: "2026-06-01" })
  })

  it("falls back to the default range for malformed date strings", () => {
    expect(resolvePnlRange("not-a-date", "2026/07/01")).toEqual({ from: "2026-04-13", to: "2026-07-14" })
  })

  it("rejects calendar-impossible dates that Date would otherwise roll over", () => {
    // 2026-02-31 does not exist; naive `new Date()` parsing rolls it to March 3.
    expect(resolvePnlRange("2026-02-31", "2026-07-14")).toEqual({ from: "2026-04-13", to: "2026-07-14" })
  })

  it("accepts a leap-day date", () => {
    expect(resolvePnlRange("2024-02-29", "2026-07-14")).toEqual({ from: "2024-02-29", to: "2026-07-14" })
  })
})

describe("truckPnlRangeCsv", () => {
  const range = { from: "2026-01-01", to: "2026-03-31" }

  const row = (overrides: Partial<TruckPnl> = {}): TruckPnl => ({
    truck_id: "t1",
    unit_number: "101",
    revenue_cents: "500000",
    fuel_cents: "120000",
    maintenance_cents: "10000",
    other_expense_cents: "5000",
    loaded_miles: "2000",
    deadhead_miles: "150",
    net_cents: 365000,
    ...overrides,
  })

  it("names the file after the range", () => {
    const { filename } = truckPnlRangeCsv([], range)
    expect(filename).toBe("per-truck-pnl_2026-01-01_2026-03-31.csv")
  })

  it("emits a header row plus one row per truck with dollars and net/mile", () => {
    const { csv } = truckPnlRangeCsv([row()], range)
    const [header, dataRow] = csv.split("\n")
    expect(header).toBe("Truck,Revenue,Fuel,Maintenance,OtherExpenses,Net,LoadedMiles,NetPerMile")
    expect(dataRow).toBe("101,5000.00,1200.00,100.00,50.00,3650.00,2000,1.82")
  })

  it("leaves NetPerMile blank instead of dividing by zero when loaded_miles is falsy", () => {
    const { csv } = truckPnlRangeCsv([row({ loaded_miles: null })], range)
    const [, dataRow] = csv.split("\n")
    expect(dataRow.endsWith(",0,")).toBe(true)
  })

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    const { csv } = truckPnlRangeCsv([row({ unit_number: 'Unit, "East"\nFleet' })], range)
    expect(csv).toContain('"Unit, ""East""\nFleet",5000.00,1200.00')
  })

  it("returns just the header for an empty fleet", () => {
    const { csv } = truckPnlRangeCsv([], range)
    expect(csv).toBe("Truck,Revenue,Fuel,Maintenance,OtherExpenses,Net,LoadedMiles,NetPerMile")
  })
})

describe("pnlPresetRanges", () => {
  it("builds MTD, last month, last quarter, and YTD for a mid-year date", () => {
    // 2026-07-14 is Q3 — "last quarter" should be the complete prior quarter (Apr-Jun).
    const presets = pnlPresetRanges(new Date("2026-07-14T12:00:00Z"))
    expect(presets).toEqual([
      { key: "mtd", label: "MTD", range: { from: "2026-07-01", to: "2026-07-14" } },
      { key: "last-month", label: "Last month", range: { from: "2026-06-01", to: "2026-06-30" } },
      { key: "last-quarter", label: "Last quarter", range: { from: "2026-04-01", to: "2026-06-30" } },
      { key: "ytd", label: "YTD", range: { from: "2026-01-01", to: "2026-07-14" } },
    ])
  })

  it("rolls last month back into the prior year in January", () => {
    const presets = pnlPresetRanges(new Date("2026-01-15T12:00:00Z"))
    const lastMonth = presets.find((p) => p.key === "last-month")
    expect(lastMonth?.range).toEqual({ from: "2025-12-01", to: "2025-12-31" })
  })

  it("rolls last quarter back into the prior year for a Q1 date", () => {
    // Q1 2026 (Jan-Mar) -> last complete quarter is Q4 2025 (Oct-Dec).
    const presets = pnlPresetRanges(new Date("2026-02-10T12:00:00Z"))
    const lastQuarter = presets.find((p) => p.key === "last-quarter")
    expect(lastQuarter?.range).toEqual({ from: "2025-10-01", to: "2025-12-31" })
  })
})

describe("parseStoredPnlRange", () => {
  it("returns null for a missing value", () => {
    expect(parseStoredPnlRange(null)).toBeNull()
    expect(parseStoredPnlRange(undefined)).toBeNull()
    expect(parseStoredPnlRange("")).toBeNull()
  })

  it("parses a well-formed stored range", () => {
    expect(parseStoredPnlRange("2026-01-01_2026-03-31")).toEqual({ from: "2026-01-01", to: "2026-03-31" })
  })

  it("swaps a backwards stored range instead of erroring", () => {
    expect(parseStoredPnlRange("2026-06-01_2026-01-01")).toEqual({ from: "2026-01-01", to: "2026-06-01" })
  })

  it("returns null for a tampered value with extra segments", () => {
    expect(parseStoredPnlRange("2026-01-01_2026-03-31_extra")).toBeNull()
  })

  it("returns null for malformed or calendar-impossible dates", () => {
    expect(parseStoredPnlRange("not-a-date_2026-03-31")).toBeNull()
    expect(parseStoredPnlRange("2026-02-31_2026-03-31")).toBeNull()
    expect(parseStoredPnlRange("garbage")).toBeNull()
  })
})
