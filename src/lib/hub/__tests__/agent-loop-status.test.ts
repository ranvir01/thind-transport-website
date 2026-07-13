import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory.mjs used to process.exit() right after
 * console.log-ing ~190KB of JSON; piped stdout flushes asynchronously, so the
 * consumer received a truncated fragment, JSON.parse threw, and a bare catch
 * reported "Pending claude/* branches: 0" while 200+ branches were pending.
 * parsePendingCount must return null (unknown), never 0, for unreadable input.
 */
describe("parsePendingCount", () => {
  const inventory = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending }, null, 2)

  it("returns the pending array length for well-formed output", () => {
    expect(parsePendingCount(inventory([]))).toBe(0)
    expect(parsePendingCount(inventory([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("returns null for truncated JSON instead of 0", () => {
    const full = inventory([{ branch: "claude/a" }, { branch: "claude/b" }])
    expect(parsePendingCount(full.slice(0, full.length - 25))).toBeNull()
  })

  it("returns null for empty output", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(inventory("217"))).toBeNull()
  })
})
