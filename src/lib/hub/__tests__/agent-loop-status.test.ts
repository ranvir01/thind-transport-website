import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once JSON.parse'd the inventory's --json output and
 * swallowed every failure to 0, so a truncated pipe (the inventory called
 * process.exit before stdout flushed) printed "Pending claude/* branches: 0"
 * while agent:branches listed 300+. Unusable output must return null — never
 * a fake 0 — so the caller reports UNKNOWN instead of a clean bill.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from valid inventory JSON", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toBe(2)
  })

  it("returns 0 for a genuinely empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null (not 0) for empty output", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null (not 0) for crash text on stdout", () => {
    expect(parsePendingCount("Error: something broke\n    at main()")).toBeNull()
  })

  it("returns null when the pending field is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 7 }))).toBeNull()
  })
})
