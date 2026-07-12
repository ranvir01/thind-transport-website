import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { pendingSummaryLines } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status printed "Pending claude/* branches: 0" while
 * agent:branches showed 217, because the old execSync + JSON.parse path
 * swallowed inventory errors to 0. A failed inventory must render as
 * UNKNOWN, never as a zero the integrator would idle on.
 */
describe("pendingSummaryLines", () => {
  it("renders a real count with the follow-up hint", () => {
    expect(pendingSummaryLines({ ok: true, count: 191 })).toEqual([
      "Pending claude/* branches (not on main): 191",
      "  Run: npm run agent:branches",
    ])
  })

  it("renders a genuine zero without the hint", () => {
    expect(pendingSummaryLines({ ok: true, count: 0 })).toEqual([
      "Pending claude/* branches (not on main): 0",
    ])
  })

  it("never renders an inventory failure as 0", () => {
    const lines = pendingSummaryLines({ ok: false, error: "ENOBUFS" })
    expect(lines.join("\n")).toContain("UNKNOWN")
    expect(lines.join("\n")).toContain("ENOBUFS")
    expect(lines.join("\n")).not.toMatch(/branches \(not on main\): 0/)
  })
})
