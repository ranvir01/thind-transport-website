import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { describePendingBranches } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once shelled out to agent-branch-inventory --json
 * and swallowed every subprocess/parse failure into "Pending: 0" while
 * agent:branches showed 217 pending — the integrator saw a healthy loop that
 * wasn't. The section formatter must render UNKNOWN on failure and a MISMATCH
 * warning when 0 pending contradicts the raw ahead-of-main count.
 */
describe("describePendingBranches", () => {
  it("renders the pending count with the scanned total", () => {
    const lines = describePendingBranches({ rows: [{}, {}, {}], scanned: 178, rawAheadOfMain: 178 })
    expect(lines[0]).toContain("Pending claude/* branches (not on main): 3 (scanned 178)")
    expect(lines[1]).toContain("npm run agent:branches")
  })

  it("renders UNKNOWN — never 0 — when the inventory failed", () => {
    const lines = describePendingBranches(null, "spawn ENOMEM")
    expect(lines[0]).toContain("UNKNOWN")
    expect(lines[0]).toContain("spawn ENOMEM")
    expect(lines.join("\n")).not.toMatch(/:\s*0\b/)
  })

  it("renders UNKNOWN even without an error message", () => {
    const lines = describePendingBranches(null)
    expect(lines[0]).toContain("UNKNOWN — inventory failed")
  })

  it("warns on 0 pending that contradicts raw ahead-of-main branches", () => {
    const lines = describePendingBranches({ rows: [], scanned: 200, rawAheadOfMain: 42 })
    expect(lines[0]).toContain("0 (scanned 200)")
    expect(lines[1]).toContain("MISMATCH")
    expect(lines[1]).toContain("42")
  })

  it("stays quiet on a genuinely clean loop", () => {
    const lines = describePendingBranches({ rows: [], scanned: 200, rawAheadOfMain: 0 })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain("Pending claude/* branches (not on main): 0")
  })
})
