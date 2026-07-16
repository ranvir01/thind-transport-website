import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json once got truncated mid-pipe
 * (process.exit before stdout flushed), and agent-loop-status coerced the
 * JSON.parse failure to 0 — reporting "Pending claude/* branches: 0" while
 * 200+ branches were waiting for the integrator. A parse failure must
 * surface as null (UNKNOWN), never as 0.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from valid inventory JSON", () => {
    const out = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(parsePendingCount(out)).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    expect(parsePendingCount(truncated)).toBeNull()
  })

  it("returns null for empty output (spawn failure)", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "origin/main" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 7 }))).toBeNull()
  })
})
