import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once swallowed a JSON parse failure to a pending
 * count of 0 while agent:branches showed 200+ unpicked branches. The payload
 * was truncated mid-string because the inventory called process.exit() before
 * its piped stdout flushed. A count of 0 and "the data is unreadable" must
 * never be conflated.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from well-formed inventory JSON", () => {
    const out = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(parsePendingCount(out)).toEqual({ count: 2 })
  })

  it("reports a genuine empty inventory as count 0, not an error", () => {
    const out = JSON.stringify({ integrator: "x", main: "y", pending: [] })
    expect(parsePendingCount(out)).toEqual({ count: 0 })
  })

  it("reports truncated JSON as an error, never count 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a", subject: "some work" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeUndefined()
    expect(result.error).toBeTruthy()
  })

  it("reports parseable-but-wrong-shape output as an error", () => {
    expect(parsePendingCount(JSON.stringify({ pending: "nope" })).error).toBeTruthy()
    expect(parsePendingCount(JSON.stringify({ other: [] })).error).toBeTruthy()
    expect(parsePendingCount("null").error).toBeTruthy()
  })
})
