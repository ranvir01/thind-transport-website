import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once JSON.parse'd the inventory subprocess output
 * inside a swallowing try/catch, so truncated output (the inventory called
 * process.exit() before its piped stdout drained past 64 KiB) read as
 * "0 pending" while agent:branches showed 200+. The parser must report an
 * error for anything that isn't a complete { pending: [...] } document —
 * never coerce failure to zero.
 */
describe("parsePendingCount", () => {
  it("counts pending[] in a complete document", () => {
    const doc = JSON.stringify({ integrator: "x", main: "y", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(doc)).toEqual({ count: 2 })
  })

  it("returns 0 for an empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toEqual({ count: 0 })
  })

  it("errors on empty output instead of reporting 0", () => {
    expect(parsePendingCount("")).toHaveProperty("error")
    expect(parsePendingCount("   \n")).toHaveProperty("error")
  })

  it("errors on truncated JSON (the 64 KiB pipe-buffer failure mode)", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/x", files: ["a", "b"] }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    const result = parsePendingCount(truncated)
    expect(result).toHaveProperty("error")
    expect(result.error).toContain("truncated")
  })

  it("errors when pending[] is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ main: "y" }))).toHaveProperty("error")
    expect(parsePendingCount(JSON.stringify({ pending: 7 }))).toHaveProperty("error")
  })
})
