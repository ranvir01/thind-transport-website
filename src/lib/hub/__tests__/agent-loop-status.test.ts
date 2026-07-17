import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once swallowed inventory failures to a pending
 * count of 0 while agent:branches showed 217 — a bare catch around
 * JSON.parse hid the error. parsePendingCount must return a distinct
 * { error } for every failure shape so the caller can never print 0
 * when the truth is "unknown".
 */
describe("parsePendingCount", () => {
  it("returns the pending array length on valid inventory JSON", () => {
    const out = JSON.stringify({ integrator: "x", main: "y", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toEqual({ count: 2 })
  })

  it("returns count 0 for a genuinely empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toEqual({ count: 0 })
  })

  it("returns an error, not 0, for invalid JSON", () => {
    const res = parsePendingCount("fatal: not a git repository")
    expect(res.count).toBeUndefined()
    expect(res.error).toMatch(/not valid JSON/)
  })

  it("returns an error, not 0, for empty output", () => {
    const res = parsePendingCount("")
    expect(res.count).toBeUndefined()
    expect(res.error).toMatch(/not valid JSON/)
  })

  it("returns an error, not 0, for truncated JSON (maxBuffer overflow shape)", () => {
    const full = JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] })
    const res = parsePendingCount(full.slice(0, 20))
    expect(res.count).toBeUndefined()
    expect(res.error).toMatch(/not valid JSON/)
  })

  it("returns an error when JSON parses but has no pending[] array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: null })).error).toMatch(/no pending\[\] array/)
    expect(parsePendingCount(JSON.stringify({ branches: [] })).error).toMatch(/no pending\[\] array/)
    expect(parsePendingCount("null").error).toMatch(/no pending\[\] array/)
  })
})
