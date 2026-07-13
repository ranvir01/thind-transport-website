import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: the inventory's --json output used to be truncated mid-payload
 * when piped (process.exit before stdout flushed), and agent-loop-status
 * swallowed the resulting parse error into "0 pending" — reporting a clean
 * loop while 200+ branches sat unpicked. Bad JSON must surface as null
 * ("unknown"), never as zero.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from a well-formed payload", () => {
    const payload = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(parsePendingCount(payload)).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null for truncated JSON, not 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null when the pending field is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({}))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 3 }))).toBeNull()
    expect(parsePendingCount("")).toBeNull()
  })
})
