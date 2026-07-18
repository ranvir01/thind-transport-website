import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once swallowed a JSON.parse failure to 0 and
 * printed "Pending claude/* branches: 0" while agent:branches showed 217.
 * (Root cause: the inventory's --json path called process.exit right after
 * console.log, truncating piped stdout mid-document.) A failed parse must
 * surface as UNKNOWN (count: null + error), never as 0.
 */
describe("parsePendingCount", () => {
  const validPayload = JSON.stringify({
    integrator: "origin/claude/hauldesk-project-setup-l1luoo",
    main: "origin/main",
    pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
  })

  it("returns the pending count for valid inventory JSON", () => {
    expect(parsePendingCount(validPayload)).toEqual({ count: 2, error: null })
  })

  it("returns 0 (not an error) when pending is a genuinely empty array", () => {
    const empty = JSON.stringify({ integrator: "i", main: "m", pending: [] })
    expect(parsePendingCount(empty)).toEqual({ count: 0, error: null })
  })

  it("truncated JSON yields count null with a parse error, never 0", () => {
    const truncated = validPayload.slice(0, Math.floor(validPayload.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/parse failed/i)
  })

  it("valid JSON without a pending[] array yields count null", () => {
    const wrongShape = JSON.stringify({ integrator: "i", main: "m", pending: "217" })
    const result = parsePendingCount(wrongShape)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/pending\[\]/)
  })

  it("empty output yields count null, never 0", () => {
    expect(parsePendingCount("").count).toBeNull()
    expect(parsePendingCount("   \n").count).toBeNull()
  })
})
