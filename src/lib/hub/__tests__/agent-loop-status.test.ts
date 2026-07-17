import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory once truncated its --json output by
 * calling process.exit before async stdout flushed; agent-loop-status
 * swallowed the resulting parse error and reported "0 pending" while 200+
 * branches were waiting. A broken inventory must read as UNKNOWN, never 0.
 */
describe("parsePendingCount", () => {
  const valid = JSON.stringify({
    integrator: "origin/claude/hauldesk-project-setup-l1luoo",
    main: "origin/main",
    pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
  })

  it("counts pending branches from valid inventory JSON", () => {
    expect(parsePendingCount(valid)).toEqual({ count: 2 })
  })

  it("reports 0 only when the pending array is genuinely empty", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toEqual({ count: 0 })
  })

  it("truncated JSON (the pipe-flush bug) is an error, not 0", () => {
    const truncated = valid.slice(0, Math.floor(valid.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/unreadable/)
  })

  it("valid JSON without a pending[] array is an error, not 0", () => {
    const result = parsePendingCount(JSON.stringify({ pending: "oops" }))
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/no pending\[\] array/)
  })

  it("empty output is an error, not 0", () => {
    expect(parsePendingCount("").count).toBeNull()
  })
})
