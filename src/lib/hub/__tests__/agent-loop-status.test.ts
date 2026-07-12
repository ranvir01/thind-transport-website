import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once shelled out to the branch inventory, hit
 * truncated JSON (the inventory process.exit()ed before its piped stdout
 * drained), and silently coerced the parse failure to "0 pending" while
 * agent:branches showed 200+. parsePendingCount must throw on anything
 * that isn't a well-formed inventory payload — never default to 0.
 */
describe("parsePendingCount", () => {
  const payload = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending })

  it("returns the pending array length", () => {
    expect(parsePendingCount(payload([]))).toBe(0)
    expect(parsePendingCount(payload([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("throws on truncated JSON instead of reading 0", () => {
    const full = payload([{ branch: "claude/a" }])
    expect(() => parsePendingCount(full.slice(0, full.length - 20))).toThrow()
  })

  it("throws when the pending array is missing or not an array", () => {
    expect(() => parsePendingCount(JSON.stringify({ main: "origin/main" }))).toThrow(/pending/)
    expect(() => parsePendingCount(payload("217"))).toThrow(/pending/)
  })

  it("throws on empty output", () => {
    expect(() => parsePendingCount("")).toThrow()
  })
})
