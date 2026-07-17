import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status printed "Pending claude/* branches: 0" while
 * agent:branches showed 200+. The inventory child exited before flushing its
 * piped stdout, the truncated JSON failed to parse, and the catch swallowed
 * the error to 0. The parser must never report a failure as a clean zero.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from valid inventory JSON", () => {
    const out = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(parsePendingCount(out)).toEqual({ count: 2, error: null })
  })

  it("reports zero pending as a real zero", () => {
    const out = JSON.stringify({ integrator: "x", main: "y", pending: [] })
    expect(parsePendingCount(out)).toEqual({ count: 0, error: null })
  })

  it("returns null count (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] }, null, 2)
    const truncated = full.slice(0, full.length - 20)
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/parse failed/)
  })

  it("returns null count for JSON missing the pending array", () => {
    const result = parsePendingCount(JSON.stringify({ integrator: "x", main: "y" }))
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/no pending\[\] array/)
  })

  it("returns null count for empty output", () => {
    const result = parsePendingCount("")
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/parse failed/)
  })
})
