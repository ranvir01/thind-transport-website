import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status shelled out to agent-branch-inventory --json and
 * swallowed JSON.parse failures to 0, reporting "Pending claude/* branches: 0"
 * while agent:branches listed 200+. Truncated pipe output (the inventory used
 * to process.exit before stdout flushed) must surface as null/UNKNOWN, never
 * as a confident zero.
 */
describe("parsePendingCount", () => {
  it("counts the pending array of valid inventory JSON", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toBe(2)
  })

  it("returns 0 only for an actually-empty pending array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/x", subject: "some work" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null when the pending array is missing", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i", main: "m" }))).toBeNull()
    expect(parsePendingCount("")).toBeNull()
  })
})
