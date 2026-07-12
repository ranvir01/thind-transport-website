import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { pendingCountFromJson } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once swallowed JSON.parse errors to a pending
 * count of 0, so a truncated inventory payload (process.exit before stdout
 * flushed) reported "Pending claude/* branches: 0" while agent:branches
 * listed 217. The parser must throw on unreadable input, never default.
 */
describe("pendingCountFromJson", () => {
  it("counts the pending array of a well-formed payload", () => {
    const json = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(pendingCountFromJson(json)).toBe(2)
  })

  it("returns 0 only when the pending array is genuinely empty", () => {
    expect(pendingCountFromJson(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("throws on truncated JSON instead of defaulting to 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a", subject: "some work" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    expect(() => pendingCountFromJson(truncated)).toThrow()
  })

  it("throws when the payload parses but has no pending array", () => {
    expect(() => pendingCountFromJson(JSON.stringify({ pending: "217" }))).toThrow(/pending/)
    expect(() => pendingCountFromJson(JSON.stringify({ branches: [] }))).toThrow(/pending/)
    expect(() => pendingCountFromJson("null")).toThrow(/pending/)
  })
})
