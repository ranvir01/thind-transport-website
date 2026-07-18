import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0"
 * while agent:branches showed 200+. The inventory child exited before its
 * piped stdout drained, truncating the JSON at 64KB; the status script
 * swallowed the parse error to 0. Truncated/invalid JSON must surface as
 * null (UNKNOWN), never as a trustworthy-looking 0.
 */
describe("parsePendingCount", () => {
  it("counts the pending array of valid inventory JSON", () => {
    const json = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "claude/a" }, { branch: "claude/b" }] })
    expect(parsePendingCount(json)).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null for truncated JSON instead of 0", () => {
    const full = JSON.stringify({ pending: Array.from({ length: 217 }, (_, i) => ({ branch: `claude/b${i}` })) })
    expect(parsePendingCount(full.slice(0, 1000))).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
    expect(parsePendingCount("")).toBeNull()
  })
})
