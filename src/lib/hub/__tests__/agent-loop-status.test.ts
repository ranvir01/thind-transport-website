import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json output arrived truncated over the
 * execSync pipe (the inventory called process.exit before stdout flushed) and
 * the parse failure was silently swallowed to 0 — agent:status reported
 * "Pending claude/* branches: 0" while agent:branches listed 217. Unreadable
 * inventory output must surface as null (unknown), never as 0.
 */
describe("parsePendingCount", () => {
  const valid = JSON.stringify({
    integrator: "origin/claude/hauldesk-project-setup-l1luoo",
    main: "origin/main",
    pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
  })

  it("counts pending branches from valid inventory JSON", () => {
    expect(parsePendingCount(valid)).toBe(2)
  })

  it("returns 0 for a genuinely empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (unknown) for truncated JSON, not 0", () => {
    expect(parsePendingCount(valid.slice(0, valid.length - 20))).toBeNull()
  })

  it("returns null for empty output (inventory crashed)", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the pending key is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })
})
