import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once swallowed JSON.parse failures to 0, reporting
 * "Pending claude/* branches: 0" while agent:branches showed 200+. Truncated
 * inventory output (process.exit before piped stdout flushed) must surface as
 * null/UNKNOWN, never masquerade as an empty backlog.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from valid inventory JSON", () => {
    const out = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(parsePendingCount(out)).toBe(2)
  })

  it("returns 0 for a genuinely empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 10))).toBeNull()
  })

  it("returns null for non-JSON output", () => {
    expect(parsePendingCount("fatal: not a git repository")).toBeNull()
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the pending field is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })
})
