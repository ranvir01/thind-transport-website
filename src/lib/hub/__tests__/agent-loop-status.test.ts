import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status reported "Pending claude/* branches: 0" while
 * agent:branches listed 200+. The inventory subprocess's JSON arrived
 * truncated (process.exit() killed it mid-flush on a piped stdout) and the
 * status script swallowed the parse error to a fake 0. parsePendingCount
 * must distinguish "genuinely zero" from "could not read the inventory".
 */
describe("parsePendingCount", () => {
  it("counts a real pending array", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toEqual({ count: 2, error: null })
  })

  it("reports zero only for a genuinely empty pending array", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [] })
    expect(parsePendingCount(out)).toEqual({ count: 0, error: null })
  })

  it("truncated JSON yields null count, not 0", () => {
    const full = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "claude/x" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/unparseable|truncated/i)
  })

  it("valid JSON without a pending array yields null count", () => {
    const result = parsePendingCount(JSON.stringify({ integrator: "i", main: "m" }))
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/pending array/i)
  })

  it("empty output yields null count", () => {
    expect(parsePendingCount("").count).toBeNull()
  })
})
