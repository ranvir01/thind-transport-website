import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0" while
 * agent:branches listed 200+. The inventory's --json output was truncated
 * mid-stream (process.exit before the stdout pipe flushed) and the parse
 * failure was swallowed to 0. A broken read must surface as null (UNKNOWN),
 * never as a trustworthy-looking 0.
 */
describe("parsePendingCount", () => {
  it("returns the pending count for valid inventory JSON", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toBe(2)
  })

  it("returns 0 for a genuinely empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length * 0.6))
    expect(parsePendingCount(truncated)).toBeNull()
  })

  it("returns null for empty output", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "m" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })
})
