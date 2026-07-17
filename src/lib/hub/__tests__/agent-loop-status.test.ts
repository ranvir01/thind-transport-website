import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status reported "Pending claude/* branches: 0" while
 * agent:branches showed 217. The inventory child exited via process.exit()
 * right after printing >100KB of JSON, truncating the pipe mid-string; the
 * status script swallowed the parse error to 0. A count we could not parse
 * must surface as null (rendered UNKNOWN), never as 0.
 */
describe("parsePendingCount", () => {
  it("returns the pending array length for valid inventory JSON", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toBe(2)
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null, not 0, for truncated JSON (the original failure mode)", () => {
    const full = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "claude/x", subject: "some tip" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    expect(parsePendingCount(truncated)).toBeNull()
  })

  it("returns null for empty output (inventory crashed before printing)", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the pending field is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: "217" }))).toBeNull()
  })
})
