import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json once truncated mid-pipe
 * (process.exit() dropped stdout past the 64KB pipe buffer), and
 * agent-loop-status silently swallowed the JSON.parse failure to 0 —
 * reporting "Pending: 0" while 200+ branches held unpicked work.
 * The guard must distinguish "verified 0" from "couldn't tell".
 */
describe("parsePendingCount", () => {
  it("counts a valid pending array", () => {
    const raw = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] })
    expect(parsePendingCount(raw)).toEqual({ count: 2, error: null })
  })

  it("verified empty inventory is an honest 0", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toEqual({ count: 0, error: null })
  })

  it("truncated JSON yields null count, never 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/unparseable/)
  })

  it("valid JSON without a pending[] array is flagged, not counted as 0", () => {
    const result = parsePendingCount(JSON.stringify({ integrator: "x", main: "y" }))
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/no pending\[\] array/)
  })

  it("empty output yields null count", () => {
    expect(parsePendingCount("").count).toBeNull()
  })
})
