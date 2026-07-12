import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: the inventory's --json output was truncated at 64KiB by a
 * process.exit() racing the stdout pipe, and agent:status swallowed the
 * resulting JSON.parse error to a silent 0 — reporting "Pending claude/*
 * branches: 0" while agent:branches listed 200+. Unusable payloads must
 * surface as an error (count: null), never as zero.
 */
describe("parsePendingCount", () => {
  it("counts the pending array of a valid payload", () => {
    const out = JSON.stringify({ integrator: "x", main: "y", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toEqual({ count: 2, error: null })
  })

  it("returns zero for a genuinely empty pending list", () => {
    const out = JSON.stringify({ integrator: "x", main: "y", pending: [] })
    expect(parsePendingCount(out)).toEqual({ count: 0, error: null })
  })

  it("reports an error, not 0, for truncated JSON", () => {
    const full = JSON.stringify({ pending: Array.from({ length: 50 }, (_, i) => ({ branch: `b${i}` })) }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/unparseable/)
  })

  it("reports an error, not 0, for empty output", () => {
    const result = parsePendingCount("")
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/unparseable/)
  })

  it("reports an error when pending[] is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "y" })).count).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: "217" })).count).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: "217" })).error).toMatch(/no pending\[\] array/)
  })
})
