import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * The status script shells out to agent-branch-inventory --json and must never
 * report a broken payload as "0 pending". Regression: the inventory's early
 * process.exit() truncated piped JSON mid-payload, the parse error was
 * swallowed to 0, and agent:status showed "Pending: 0" while agent:branches
 * listed 200+ branches with unpicked work.
 */
describe("parsePendingCount", () => {
  it("counts the pending array of a well-formed payload", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (unknown), not 0, for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null for empty or non-JSON output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("fatal: not a git repository")).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({}))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })
})
