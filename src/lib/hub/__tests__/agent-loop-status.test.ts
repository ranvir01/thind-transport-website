import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status reported "Pending claude/* branches: 0" while
 * agent:branches showed 217. The inventory's --json stdout was truncated
 * mid-string (process.exit before the pipe flushed) and the JSON.parse catch
 * swallowed the error to 0 — a false all-clear. Unparseable output must read
 * as null (unknown), never as 0.
 */
describe("parsePendingCount", () => {
  it("returns the pending array length for valid inventory JSON", () => {
    const out = JSON.stringify({ integrator: "origin/x", main: "origin/main", pending: [{}, {}, {}] })
    expect(parsePendingCount(out)).toBe(3)
  })

  it("returns 0 only when the pending array is genuinely empty", () => {
    const out = JSON.stringify({ integrator: "origin/x", main: "origin/main", pending: [] })
    expect(parsePendingCount(out)).toBe(0)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null (not 0) for empty or whitespace output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("   \n")).toBeNull()
    expect(parsePendingCount(undefined)).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })
})
