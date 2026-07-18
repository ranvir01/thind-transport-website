import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0"
 * while agent:branches showed 217. The inventory's --json path called
 * process.exit before its piped stdout drained, so agent:status received
 * truncated JSON and its bare catch silently coerced the parse error to 0.
 * parsePendingCount must surface bad input as an error, never as 0.
 */
describe("parsePendingCount", () => {
  it("returns the pending count for valid inventory JSON", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toEqual({ count: 2 })
  })

  it("returns 0 for a valid empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toEqual({ count: 0 })
  })

  it("returns an error, not 0, for truncated JSON", () => {
    const full = JSON.stringify({ pending: new Array(300).fill({ branch: "claude/x" }) }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/not valid JSON/)
  })

  it("returns an error for empty output", () => {
    expect(parsePendingCount("").error).toMatch(/not valid JSON/)
  })

  it("returns an error when pending[] is missing", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i" })).error).toMatch(/no pending\[\] array/)
  })
})
