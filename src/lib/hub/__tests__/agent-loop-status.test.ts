import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory once called process.exit() right after
 * writing its JSON, truncating piped stdout mid-string. agent-loop-status
 * swallowed the parse error to `pending: 0`, so agent:status reported
 * "0 pending" while agent:branches listed 200+ branches. The parser must
 * surface an error instead of a silent zero.
 */
describe("parsePendingCount", () => {
  it("counts pending rows from well-formed inventory JSON", () => {
    const json = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(json)).toEqual({ count: 2 })
  })

  it("returns count 0 for an empty pending array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toEqual({ count: 0 })
  })

  it("returns an error (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/x", subject: "some work" }] }, null, 2)
    const truncated = full.slice(0, full.length - 20)
    const result = parsePendingCount(truncated)
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/unparseable/)
  })

  it("returns an error for JSON missing the pending array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i" })).error).toMatch(/no pending\[\] array/)
    expect(parsePendingCount(JSON.stringify({ pending: "217" })).error).toMatch(/no pending\[\] array/)
  })

  it("returns an error for empty output (child died before writing)", () => {
    expect(parsePendingCount("").error).toMatch(/unparseable/)
  })
})
