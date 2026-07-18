import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once swallowed inventory --json parse failures to a
 * pending count of 0, reporting "Pending claude/* branches: 0" while
 * agent:branches showed hundreds. (The inventory truncated its piped stdout by
 * calling process.exit before the async write flushed.) A broken inventory must
 * throw, never read as "all clear".
 */
describe("parsePendingCount", () => {
  const wrap = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending })

  it("counts pending branches from valid inventory JSON", () => {
    expect(parsePendingCount(wrap([]))).toBe(0)
    expect(parsePendingCount(wrap([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("throws on truncated JSON instead of returning 0", () => {
    const truncated = wrap([{ branch: "claude/a" }]).slice(0, 30)
    expect(() => parsePendingCount(truncated)).toThrow()
  })

  it("throws on empty output instead of returning 0", () => {
    expect(() => parsePendingCount("")).toThrow()
  })

  it("throws when pending[] is missing or not an array", () => {
    expect(() => parsePendingCount(JSON.stringify({ main: "origin/main" }))).toThrow(/pending/)
    expect(() => parsePendingCount(wrap("345"))).toThrow(/pending/)
  })
})
