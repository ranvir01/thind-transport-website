import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status reported "Pending claude/* branches: 0" while
 * agent:branches listed 200+. The inventory's --json output was truncated
 * mid-document (process.exit after an async console.log to a pipe), the
 * JSON.parse failed, and the catch swallowed the error into 0. The parser
 * must return null — never 0 — for anything it could not actually read.
 */
describe("parsePendingCount", () => {
  const doc = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending })

  it("returns the pending array length for a well-formed document", () => {
    expect(parsePendingCount(doc([]))).toBe(0)
    expect(parsePendingCount(doc([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("returns null for truncated JSON instead of swallowing to 0", () => {
    const full = doc([{ branch: "claude/a" }, { branch: "claude/b" }])
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null for empty or non-JSON output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("fatal: not a git repository")).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(doc("270"))).toBeNull()
    expect(parsePendingCount(JSON.stringify(null))).toBeNull()
  })
})
