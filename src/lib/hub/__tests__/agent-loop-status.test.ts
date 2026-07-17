import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0"
 * while agent:branches listed 200+. The inventory child truncated its JSON
 * mid-pipe (process.exit after a large console.log) and the status script's
 * bare catch turned the parse failure into a silent 0. parsePendingCount
 * must THROW on anything it can't fully trust — the caller reports UNKNOWN,
 * never 0.
 */
describe("parsePendingCount", () => {
  const doc = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending }, null, 2)

  it("returns the pending array length on a well-formed document", () => {
    expect(parsePendingCount(doc([]))).toBe(0)
    expect(parsePendingCount(doc([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("throws on truncated JSON instead of returning 0", () => {
    const full = doc([{ branch: "claude/a" }, { branch: "claude/b" }])
    const truncated = full.slice(0, Math.floor(full.length / 2))
    expect(() => parsePendingCount(truncated)).toThrow()
  })

  it("throws when the pending array is missing or not an array", () => {
    expect(() => parsePendingCount(JSON.stringify({ integrator: "x", main: "y" }))).toThrow(
      /pending/
    )
    expect(() => parsePendingCount(doc("314"))).toThrow(/pending/)
  })

  it("throws on empty output (child died before writing)", () => {
    expect(() => parsePendingCount("")).toThrow()
  })
})
