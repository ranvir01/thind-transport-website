import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json output was truncated at the
 * 64 KiB pipe buffer (a process.exit cut the write short) and the status
 * script swallowed the JSON.parse error to a hard 0 — reporting
 * "Pending claude/* branches: 0" while the inventory showed 217. Truncated
 * or malformed output must surface as null (UNKNOWN), never as 0.
 */
describe("parsePendingCount", () => {
  it("counts the pending array of well-formed inventory JSON", () => {
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

  it("returns null, not 0, for truncated JSON (64 KiB pipe-buffer cutoff)", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a", subject: "x".repeat(200) }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 40))).toBeNull()
  })

  it("returns null for empty or whitespace-only output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("   \n")).toBeNull()
  })

  it("returns null when the shape is unexpected (no pending array)", () => {
    expect(parsePendingCount(JSON.stringify({ pending: "217" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ branches: [] }))).toBeNull()
    expect(parsePendingCount("null")).toBeNull()
  })
})
