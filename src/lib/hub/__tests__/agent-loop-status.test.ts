import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status reported "Pending claude/* branches: 0" while
 * agent:branches showed 200+. The inventory child process exited before its
 * ~146KB JSON flushed through the pipe, JSON.parse threw on the truncated
 * string, and the catch silently defaulted to 0. Truncated or malformed
 * output must surface as null ("unknown"), never as 0.
 */
describe("parsePendingCount", () => {
  it("returns the pending count for well-formed inventory JSON", () => {
    const out = JSON.stringify({ integrator: "a", main: "b", pending: [{}, {}, {}] })
    expect(parsePendingCount(out)).toBe(3)
  })

  it("returns 0 only when pending is genuinely an empty array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null for truncated JSON, not 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/x" }, { branch: "claude/y" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 40))).toBeNull()
  })

  it("returns null for empty output", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the pending key is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 217 }))).toBeNull()
  })
})
