import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status printed "Pending claude/* branches: 0" while
 * agent:branches showed 200+. The inventory subprocess exited before its
 * piped stdout drained, execSync handed back a truncated JSON document, and
 * a silent catch collapsed the parse error to 0 — a false all-merged signal.
 * parsePendingCount must surface every failure mode as { error }, never 0.
 */
describe("parsePendingCount", () => {
  const doc = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending })

  it("counts pending branches in a well-formed document", () => {
    expect(parsePendingCount(doc([]))).toEqual({ count: 0 })
    expect(parsePendingCount(doc([{ branch: "claude/a" }, { branch: "claude/b" }]))).toEqual({
      count: 2,
    })
  })

  it("reports an error for a truncated JSON document, not 0", () => {
    const truncated = doc([{ branch: "claude/a" }]).slice(0, 40)
    const result = parsePendingCount(truncated)
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/not valid JSON/)
  })

  it("reports an error for empty output, not 0", () => {
    const result = parsePendingCount("")
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/not valid JSON/)
  })

  it("reports an error when the pending field is missing or not an array", () => {
    expect(parsePendingCount(doc(undefined)).error).toMatch(/no pending array/)
    expect(parsePendingCount(doc(null)).error).toMatch(/no pending array/)
    expect(parsePendingCount(doc(42)).error).toMatch(/no pending array/)
    expect(parsePendingCount(JSON.stringify({})).error).toMatch(/no pending array/)
  })
})
