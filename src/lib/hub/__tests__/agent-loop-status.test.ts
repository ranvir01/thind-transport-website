import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-loop-status once swallowed every JSON failure to 0, so a
 * truncated inventory document (the --json output used to be cut at the 64KB
 * pipe buffer by an early process.exit) reported "Pending claude/* branches: 0"
 * while agent:branches listed 200+. A failure must surface as count: null with
 * an error message, never as a clean zero.
 */
describe("parsePendingCount", () => {
  it("counts pending[] entries in a valid document", () => {
    const raw = JSON.stringify({ integrator: "x", main: "y", pending: [{}, {}, {}] })
    expect(parsePendingCount(raw)).toEqual({ count: 3, error: null })
  })

  it("reports a genuinely drained loop as 0", () => {
    const raw = JSON.stringify({ integrator: "x", main: "y", pending: [] })
    expect(parsePendingCount(raw)).toEqual({ count: 0, error: null })
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ integrator: "x", main: "y", pending: [{ branch: "claude/a" }] })
    const truncated = full.slice(0, full.length - 10)
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/not valid JSON/)
  })

  it("returns null (not 0) when pending[] is missing", () => {
    const result = parsePendingCount(JSON.stringify({ integrator: "x", main: "y" }))
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/no pending\[\] array/)
  })

  it("returns null (not 0) for empty output", () => {
    expect(parsePendingCount("").count).toBeNull()
  })
})
