import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0"
 * while agent:branches listed 200+. The inventory's --json stdout was
 * truncated at the 64KB pipe buffer by an early process.exit(), and the
 * status script's catch swallowed the JSON.parse error to 0. Unusable
 * payloads must come back as null (UNKNOWN), never 0.
 */
describe("parsePendingCount", () => {
  it("counts the pending array of a valid payload", () => {
    const raw = JSON.stringify({ integrator: "x", main: "y", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(raw)).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null, not 0, for truncated JSON", () => {
    const full = JSON.stringify({ pending: Array.from({ length: 50 }, (_, i) => ({ branch: `claude/b${i}` })) }, null, 2)
    expect(parsePendingCount(full.slice(0, Math.floor(full.length / 2)))).toBeNull()
  })

  it("returns null when the pending array is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "x" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 7 }))).toBeNull()
    expect(parsePendingCount("")).toBeNull()
  })
})
