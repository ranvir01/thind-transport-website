import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status shelled out to `agent-branch-inventory.mjs --json`,
 * whose process.exit() truncated piped stdout mid-JSON. The bare catch in the
 * status script then reported 217 pending branches as 0. Invalid or truncated
 * JSON must surface as null ("unknown"), never as a count of 0.
 */
describe("parsePendingCount", () => {
  it("returns the pending array length for valid inventory JSON", () => {
    expect(parsePendingCount('{"pending": []}')).toBe(0)
    expect(
      parsePendingCount('{"integrator": "x", "main": "y", "pending": [{"branch": "a"}, {"branch": "b"}]}')
    ).toBe(2)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] })
    expect(parsePendingCount(full.slice(0, full.length - 5))).toBeNull()
  })

  it("returns null for empty output (subprocess died before writing)", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the pending key is missing or not an array", () => {
    expect(parsePendingCount("{}")).toBeNull()
    expect(parsePendingCount('{"pending": 217}')).toBeNull()
  })
})
