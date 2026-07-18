import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json called process.exit() right after
 * console.log, so when agent-loop-status read it over a pipe the JSON arrived
 * truncated; the parse failure was swallowed to 0 and status reported
 * "Pending claude/* branches: 0" while 200+ branches were actually pending.
 * parsePendingCount must return null (unknown) for anything unparseable —
 * never a fabricated 0.
 */
describe("parsePendingCount", () => {
  const payload = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/i", main: "origin/main", pending }, null, 2)

  it("returns the pending array length for valid payloads", () => {
    expect(parsePendingCount(payload([]))).toBe(0)
    expect(parsePendingCount(payload([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = payload([{ branch: "claude/a" }, { branch: "claude/b" }])
    const truncated = full.slice(0, Math.floor(full.length / 2))
    expect(parsePendingCount(truncated)).toBeNull()
  })

  it("returns null for empty or whitespace output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("   \n")).toBeNull()
    expect(parsePendingCount(undefined)).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(payload("oops"))).toBeNull()
  })
})
