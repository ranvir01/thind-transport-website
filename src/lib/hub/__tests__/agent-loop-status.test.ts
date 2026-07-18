import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0" while
 * 200+ branches held unpicked work. The inventory child called process.exit()
 * right after console.log(JSON), truncating piped stdout mid-string, and the
 * status script swallowed the JSON.parse error to 0. The parse must surface
 * failure (count: null + error) instead of a confident wrong zero.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from valid inventory JSON", () => {
    const json = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(parsePendingCount(json)).toEqual({ count: 2 })
  })

  it("reports a genuine empty backlog as 0, not an error", () => {
    const json = JSON.stringify({ integrator: "i", main: "m", pending: [] })
    expect(parsePendingCount(json)).toEqual({ count: 0 })
  })

  it("returns count null with an error on truncated JSON — never 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }] })
    const truncated = full.slice(0, full.length - 10)
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/did not parse/)
  })

  it("returns count null when the pending key is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ rows: [] })).count).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 })).count).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 })).error).toMatch(/pending/)
  })
})
