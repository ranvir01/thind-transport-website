import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status shelled out to `agent-branch-inventory --json`,
 * whose process.exit() truncated the piped JSON mid-flush; the bare catch
 * then reported "Pending claude/* branches: 0" against 300+ real branches.
 * parsePendingCount must return null (unknown) — never 0 — for anything
 * that isn't a well-formed inventory payload.
 */
describe("parsePendingCount", () => {
  it("counts pending rows in a well-formed payload", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "claude/a" }, { branch: "claude/b" }] })
    expect(parsePendingCount(out)).toBe(2)
  })

  it("returns a genuine 0 for an empty pending array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i", main: "m", pending: [] }))).toBe(0)
  })

  it("returns null for truncated JSON instead of swallowing to 0", () => {
    const full = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "claude/a" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null for empty or whitespace output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("   \n")).toBeNull()
    expect(parsePendingCount(undefined)).toBeNull()
  })

  it("returns null when the pending field is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i", main: "m" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })
})
