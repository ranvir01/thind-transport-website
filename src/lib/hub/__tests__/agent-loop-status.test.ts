import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status reported "Pending claude/* branches: 0" while
 * agent:branches listed 217+. The inventory's process.exit truncated its piped
 * JSON mid-stream, the status script's catch swallowed the parse error to 0,
 * and the loop read a false all-clear. Unreadable output must be null (UNKNOWN),
 * never 0.
 */
describe("parsePendingCount", () => {
  it("counts the pending array of a well-formed payload", () => {
    const payload = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(parsePendingCount(payload)).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null for truncated JSON instead of swallowing to 0", () => {
    const full = JSON.stringify({ main: "origin/main", pending: [{ branch: "claude/a" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null for empty output", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the pending key is missing or not an array (shape drift)", () => {
    expect(parsePendingCount(JSON.stringify({ branches: [] }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 217 }))).toBeNull()
    expect(parsePendingCount(JSON.stringify(null))).toBeNull()
  })
})
