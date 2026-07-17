import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json used to process.exit() before its
 * stdout pipe flushed, so agent:status intermittently received JSON truncated
 * at the 64KB pipe buffer, swallowed the parse error, and reported
 * "Pending claude/* branches: 0" while hundreds were pending. The parser must
 * return null (UNKNOWN) for anything unparseable — never a silent 0.
 */
describe("parsePendingCount", () => {
  const validPayload = JSON.stringify({
    integrator: "origin/claude/hauldesk-project-setup-l1luoo",
    main: "origin/main",
    pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
  })

  it("returns the pending count for a well-formed payload", () => {
    expect(parsePendingCount(validPayload)).toBe(2)
  })

  it("returns 0 only when pending is genuinely an empty array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null, not 0, for truncated JSON (the 64KB pipe-buffer failure)", () => {
    expect(parsePendingCount(validPayload.slice(0, 40))).toBeNull()
  })

  it("returns null for empty output (inventory crashed)", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the payload parses but has no pending array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: "oops" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
  })
})
