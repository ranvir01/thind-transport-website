import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status shelled out to the inventory's --json mode, but the
 * inventory called process.exit() right after console.log, so payloads over the
 * pipe buffer arrived truncated. The old catch swallowed the parse error to 0
 * and the loop reported "0 pending" while 200+ branches waited. Unreadable
 * payloads must surface as null ("unknown"), never as 0.
 */
describe("parsePendingCount", () => {
  const valid = JSON.stringify({
    integrator: "origin/claude/hauldesk-project-setup-l1luoo",
    main: "origin/main",
    pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
  })

  it("counts pending rows in a valid payload", () => {
    expect(parsePendingCount(valid)).toBe(2)
  })

  it("returns 0 for a valid payload with no pending branches", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (unknown), not 0, for a truncated payload", () => {
    expect(parsePendingCount(valid.slice(0, valid.length - 40))).toBeNull()
  })

  it("returns null for empty output", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the shape is wrong (no pending array)", () => {
    expect(parsePendingCount(JSON.stringify({ rows: [] }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })
})
