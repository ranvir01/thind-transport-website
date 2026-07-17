import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory.mjs called process.exit() right after
 * console.log-ing ~245KB of JSON. Piped stdout (execSync) flushes async, so
 * the JSON arrived truncated, JSON.parse threw, and the catch reported
 * "Pending claude/* branches: 0" while 217+ branches were actually pending.
 * The status script must surface UNKNOWN (null), never a silent 0.
 */
describe("parsePendingCount", () => {
  it("returns the pending count for valid inventory JSON", () => {
    const out = JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending: [{}, {}, {}] })
    expect(parsePendingCount(out)).toBe(3)
  })

  it("returns 0 for an empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (unknown) for truncated JSON, not 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null for empty output", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 217 }))).toBeNull()
  })
})
