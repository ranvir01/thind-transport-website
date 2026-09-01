import { describe, expect, it } from "vitest"
import { APPLY_TOTAL_STEPS, applyProgressPercent } from "../apply-progress"

/**
 * Regression for the /apply wizard progress bar: the old inline formula
 * (((step - 1) / 4) * 100 with a 0→25 render hack) showed 25% on both step 1
 * and step 2 — no visible progress for completing the qualify step — and
 * capped the final step at 75%. The bar must strictly advance on every step.
 */
describe("applyProgressPercent", () => {
  it("advances strictly on every step (no two steps share a width)", () => {
    const widths = [1, 2, 3, 4].map(applyProgressPercent)
    expect(widths).toEqual([25, 50, 75, 100])
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThan(widths[i - 1])
    }
  })

  it("never renders an empty bar on the first step", () => {
    expect(applyProgressPercent(1)).toBeGreaterThan(0)
  })

  it("clamps out-of-range steps (success step 5, defensive 0) into the bar's domain", () => {
    expect(applyProgressPercent(APPLY_TOTAL_STEPS + 1)).toBe(100)
    expect(applyProgressPercent(0)).toBe(25)
  })
})
