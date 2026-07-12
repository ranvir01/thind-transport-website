import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status shelled out to agent-branch-inventory.mjs --json,
 * which called process.exit() right after console.log — async pipe writes got
 * truncated mid-string, JSON.parse threw, and a bare catch reported the 217
 * pending branches as "0". A broken payload must surface as UNKNOWN (count
 * null + error), never as a confident zero.
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

  it("valid JSON with an empty pending list is a real zero", () => {
    const out = JSON.stringify({ integrator: "x", main: "y", pending: [] })
    expect(parsePendingCount(out)).toEqual({ count: 0, error: null })
  })

  it("truncated JSON (the exit-before-flush bug) yields null, not 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] }, null, 2)
    const truncated = full.slice(0, full.length - 25)
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/did not parse/)
  })

  it("empty output yields null, not 0", () => {
    const result = parsePendingCount("")
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/did not parse/)
  })

  it("parseable JSON without a pending[] array yields null", () => {
    const result = parsePendingCount(JSON.stringify({ ok: true }))
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/no pending\[\] array/)
  })
})
