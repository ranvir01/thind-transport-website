/**
 * Pins iftaWorksheetWarnings — the single source of the warning sentences the
 * PDF/CSV exports carry, and its policy: missing rates and stateless gallons
 * always warn; stale rates only warn on unfiled reports.
 */
import { describe, expect, it } from "vitest"
import { iftaWorksheetWarnings } from "@/lib/hub/ifta-core"

const cleanRow = { jurisdiction: "WA", rate: 0.494, surchargeRate: 0 }

describe("iftaWorksheetWarnings", () => {
  it("returns no warnings for a clean report", () => {
    expect(
      iftaWorksheetWarnings({
        status: "draft",
        rows: [cleanRow],
        ratesOnFile: { WA: { rate: 0.494 } },
      })
    ).toEqual([])
  })

  it("warns on missing rates naming every jurisdiction", () => {
    const warnings = iftaWorksheetWarnings({
      status: "draft",
      rows: [],
      missingRates: ["AZ", "NV"],
      ratesOnFile: {},
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("Missing rates for AZ, NV")
    expect(warnings[0]).toContain("recompute before filing")
  })

  it("warns when a rate on file changed after compute — but not on filed quarters", () => {
    const input = {
      rows: [cleanRow],
      ratesOnFile: { WA: { rate: 0.499 } },
    }
    const draft = iftaWorksheetWarnings({ status: "draft" as const, ...input })
    expect(draft).toHaveLength(1)
    expect(draft[0]).toContain("Rates on file for WA changed")
    expect(iftaWorksheetWarnings({ status: "reviewed" as const, ...input })).toHaveLength(1)
    // Filed quarters are history; the rate matrix moving on is not their problem.
    expect(iftaWorksheetWarnings({ status: "filed" as const, ...input })).toEqual([])
  })

  it("warns on stateless gallons with a formatted count, even when filed", () => {
    const warnings = iftaWorksheetWarnings({
      status: "filed",
      rows: [],
      unknownJurisdictionGallons: 1234,
      ratesOnFile: {},
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("1,234 gal of tractor fuel have no state")
  })

  it("stacks all three warnings in worksheet-screen order", () => {
    const warnings = iftaWorksheetWarnings({
      status: "draft",
      rows: [cleanRow],
      missingRates: ["MT"],
      unknownJurisdictionGallons: 10,
      ratesOnFile: { WA: { rate: 0.5 } },
    })
    expect(warnings).toHaveLength(3)
    expect(warnings[0]).toContain("Missing rates")
    expect(warnings[1]).toContain("changed after this report was computed")
    expect(warnings[2]).toContain("no state")
  })
})
