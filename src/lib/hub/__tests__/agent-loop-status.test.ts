import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json output was truncated mid-pipe
 * (process.exit before stdout flushed), JSON.parse threw, and the catch
 * reported "Pending claude/* branches: 0" while 200+ branches waited.
 * A broken payload must surface as null (unknown), never as 0.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from well-formed inventory JSON", () => {
    const out = JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending: [{}, {}, {}] })
    expect(parsePendingCount(out)).toBe(3)
  })

  it("returns 0 only when the pending array is genuinely empty", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null on truncated JSON instead of a silent 0", () => {
    const full = JSON.stringify({ pending: new Array(200).fill({ branch: "claude/x" }) }, null, 2)
    expect(parsePendingCount(full.slice(0, Math.floor(full.length / 2)))).toBeNull()
  })

  it("returns null on empty or whitespace output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("   \n")).toBeNull()
    expect(parsePendingCount(undefined)).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })
})
