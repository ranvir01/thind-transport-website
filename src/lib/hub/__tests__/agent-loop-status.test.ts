import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json used to process.exit() before its
 * piped stdout flushed, so agent:status received truncated JSON, and the old
 * `catch { pendingCount = 0 }` reported "Pending claude/* branches: 0" while
 * agent:branches showed 200+. Parse failures must surface as unknown (null),
 * never as an empty queue.
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

  it("returns 0 for a genuinely empty queue", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (unknown), not 0, for truncated JSON", () => {
    expect(parsePendingCount(valid.slice(0, valid.length - 20))).toBeNull()
  })

  it("returns null for empty output (child exec failed)", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the pending array is missing", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
  })
})
