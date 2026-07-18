import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-loop-status once wrapped JSON.parse of the inventory's
 * --json output in a catch that defaulted to 0, so a truncated pipe (the
 * inventory used to process.exit() before stdout flushed) reported
 * "Pending claude/* branches: 0" while agent:branches showed hundreds.
 * The parser must throw on bad input so the caller reports UNKNOWN.
 */
describe("parsePendingCount", () => {
  const valid = (pending: unknown[]) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending })

  it("returns the pending array length for valid output", () => {
    expect(parsePendingCount(valid([]))).toBe(0)
    expect(parsePendingCount(valid([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("throws on truncated JSON instead of returning 0", () => {
    const truncated = valid([{ branch: "claude/a" }]).slice(0, 40)
    expect(() => parsePendingCount(truncated)).toThrow()
  })

  it("throws on empty output instead of returning 0", () => {
    expect(() => parsePendingCount("")).toThrow()
  })

  it("throws when the pending array is missing", () => {
    expect(() => parsePendingCount(JSON.stringify({ main: "origin/main" }))).toThrow(
      /no pending array/
    )
  })
})
