/**
 * Home `/` route cards must quote PAY_RATES, never literals.
 *
 * The local and regional cards already showed the published company
 * ranges, but the OTR card mixed company + owner-operator into invented
 * figures ($65K-$280K, $0.55-$0.60 CPM, $2.25-$3.25/mile, $180K-$280K).
 * There is no company CPM floor in constants.ts — do not invent $0.60/mi.
 *
 * A wrong number still renders, so E2E cannot catch this. Assert the
 * source the way company-facts-from-constants.test.ts does.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { PAY_RATES } from "@/lib/constants"

const src = readFileSync(path.resolve(__dirname, "./RoutesSection.tsx"), "utf8")

describe("RoutesSection sources pay from PAY_RATES", () => {
  it("reads local, regional, OTR, and owner-operator from constants", () => {
    expect(src).toContain("PAY_RATES.companyDriver.local")
    expect(src).toContain("PAY_RATES.companyDriver.regional")
    expect(src).toContain("PAY_RATES.companyDriver.otr")
    expect(src).toContain("PAY_RATES.ownerOperator")
    expect(src).toContain("LOCAL.annual")
    expect(src).toContain("LOCAL.perMile")
    expect(src).toContain("REGIONAL.annual")
    expect(src).toContain("REGIONAL.perMile")
    expect(src).toContain("OTR.annual")
    expect(src).toContain("OTR.perMile")
    expect(src).toContain("OO.perMile")
    expect(src).toContain("OO.annualGross")
    expect(src).toContain("OO.commission")
  })

  it("does not ship the stale mixed OTR / O/O ranges", () => {
    expect(src).not.toContain("$65K-$280K")
    expect(src).not.toContain("$0.55-$0.60")
    expect(src).not.toContain("$2.25-$3.25")
    expect(src).not.toContain("$180K-$280K")
    expect(src).not.toContain("$0.60")
  })

  it("published OTR and O/O constants are the figures the cards interpolate", () => {
    // This branch publishes the GBP pay/fleet facts. Pin those, not main's
    // later $0.63 / 90% figures — the merge-ref unit job failed on that drift.
    expect(PAY_RATES.companyDriver.otr.perMile).toBe("$0.60-$0.65")
    expect(PAY_RATES.companyDriver.otr.annual).toBe("$93K-$110K")
    expect(PAY_RATES.ownerOperator.perMile).toBe("$2.50-$3.50")
    expect(PAY_RATES.ownerOperator.annualGross).toBe("$250K-$300K")
    expect(PAY_RATES.ownerOperator.commission).toBe("91%")
    expect(PAY_RATES.companyDriver.local.annual).toBe("$78K-$85K")
    expect(PAY_RATES.companyDriver.regional.annual).toBe("$78K-$95K")
    expect(PAY_RATES.companyDriver).not.toHaveProperty("cpmFloor")
  })
})
