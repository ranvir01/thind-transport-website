import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json used to process.exit() right after
 * console.log, so anything past the 64KB pipe buffer was dropped. The status
 * script's bare try/catch then read the truncated JSON as pendingCount = 0,
 * reporting "Pending claude/* branches: 0" while agent:branches listed 217.
 * Unparseable output must surface as null (UNKNOWN), never as a clean zero.
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

  it("returns 0 for a genuinely empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] })
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null (not 0) for non-JSON output", () => {
    expect(parsePendingCount("fatal: not a git repository")).toBeNull()
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the pending key is missing or malformed", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "x" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: "217" }))).toBeNull()
  })
})
