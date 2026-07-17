import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status shelled out to agent-branch-inventory.mjs --json,
 * and a bare catch turned ANY parse failure into "Pending: 0". The inventory's
 * process.exit() after console.log truncated piped stdout mid-write, so the
 * status screen showed 0 pending while agent:branches listed 300+. The parse
 * must throw on bad input so the caller reports UNKNOWN, never a silent 0.
 */
describe("parsePendingCount", () => {
  it("returns the pending array length for valid inventory JSON", () => {
    const raw = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(raw)).toBe(2)
  })

  it("returns 0 when pending is genuinely empty", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("throws on truncated JSON instead of returning 0", () => {
    const raw = JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] }).slice(0, 30)
    expect(() => parsePendingCount(raw)).toThrow()
  })

  it("throws when the payload has no pending[] array", () => {
    expect(() => parsePendingCount(JSON.stringify({ pending: null }))).toThrow(/pending\[\]/)
    expect(() => parsePendingCount(JSON.stringify({}))).toThrow(/pending\[\]/)
  })
})
