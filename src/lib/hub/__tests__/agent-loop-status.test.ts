import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status shelled out to `agent-branch-inventory --json`,
 * whose process.exit() truncated the ~200KB JSON when stdout was a pipe.
 * The parse failure was swallowed to 0, so status said "Pending: 0" while
 * agent:branches listed 200+ branches. Failures must surface, never read as 0.
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

  it("returns count 0 only when pending[] is genuinely empty", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toEqual({ count: 0 })
  })

  it("reports an error (not 0) for truncated JSON", () => {
    const truncated = valid.slice(0, Math.floor(valid.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/unparseable/)
  })

  it("reports an error (not 0) for empty output", () => {
    const result = parsePendingCount("")
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/unparseable/)
  })

  it("reports an error when JSON parses but has no pending[] array", () => {
    const result = parsePendingCount(JSON.stringify({ pending: "oops" }))
    expect(result.error).toMatch(/no pending\[\] array/)
  })
})
