import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingInventory, countUnmergedClaudeBranches } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status reported "Pending claude/* branches: 0" while
 * agent:branches listed hundreds. The old code collapsed every failure —
 * unparseable output, a missing pending[] array, an inventory that errored —
 * into pendingCount 0, which reads as all-clear. Failure must surface as
 * UNKNOWN, never as 0.
 */
describe("parsePendingInventory", () => {
  it("returns the pending count from healthy inventory JSON", () => {
    const raw = JSON.stringify({ integrator: "x", main: "y", pending: [{ branch: "claude/a" }, { branch: "claude/b" }] })
    expect(parsePendingInventory(raw)).toEqual({ pendingCount: 2, error: null })
  })

  it("a genuinely empty pending list is 0, not an error", () => {
    expect(parsePendingInventory(JSON.stringify({ pending: [] }))).toEqual({ pendingCount: 0, error: null })
  })

  it("invalid JSON (crash output, truncation) is an error, not 0", () => {
    const result = parsePendingInventory("node: fatal error\n{ \"pending\": [")
    expect(result.pendingCount).toBeNull()
    expect(result.error).toMatch(/not valid JSON/)
  })

  it("an inventory-reported error is propagated, not swallowed", () => {
    const raw = JSON.stringify({ integrator: "x", main: "y", error: "3 git command(s) failed while building the inventory" })
    const result = parsePendingInventory(raw)
    expect(result.pendingCount).toBeNull()
    expect(result.error).toMatch(/git command\(s\) failed/)
  })

  it("valid JSON without a pending[] array is an error, not 0", () => {
    for (const raw of ["{}", "null", JSON.stringify({ pending: "oops" })]) {
      const result = parsePendingInventory(raw)
      expect(result.pendingCount).toBeNull()
      expect(result.error).toMatch(/no pending\[\] array/)
    }
  })
})

describe("countUnmergedClaudeBranches", () => {
  it("counts origin/claude/* lines from git branch -r --no-merged", () => {
    const out = ["  origin/claude/lane-office", "  origin/claude/gallant-dijkstra-59tzfj", "  origin/cursor/website-overhaul-9724", "  origin/master"].join("\n")
    expect(countUnmergedClaudeBranches(out)).toBe(2)
  })

  it("skips the integrator branch and handles empty output", () => {
    expect(countUnmergedClaudeBranches("  origin/claude/hauldesk-project-setup-l1luoo")).toBe(0)
    expect(countUnmergedClaudeBranches("")).toBe(0)
  })
})
