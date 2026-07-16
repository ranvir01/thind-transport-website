import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json output got truncated mid-string
 * (process.exit dropped unflushed pipe output) and the old parser swallowed
 * the JSON error to 0 — agent:status claimed "Pending claude/* branches: 0"
 * while agent:branches listed 200+. Unreadable payloads must parse to null
 * (rendered UNKNOWN), never to 0.
 */
describe("parsePendingCount", () => {
  const inventory = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/integrator", main: "origin/main", pending }, null, 2)

  it("counts pending branches from well-formed inventory JSON", () => {
    expect(parsePendingCount(inventory([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending list", () => {
    expect(parsePendingCount(inventory([]))).toBe(0)
  })

  it("returns null for truncated JSON instead of coercing to 0", () => {
    const full = inventory([{ branch: "claude/gallant-dijkstra-59tzfj", aheadMain: 309 }])
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBe(null)
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "x", main: "y" }))).toBe(null)
    expect(parsePendingCount(JSON.stringify({ pending: 217 }))).toBe(null)
    expect(parsePendingCount("")).toBe(null)
    expect(parsePendingCount("not json at all")).toBe(null)
  })
})
