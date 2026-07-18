import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status shelled out to the branch inventory with --json,
 * and the inventory's process.exit() after console.log truncated the payload
 * mid-JSON whenever stdout was a pipe. The status script's bare catch then
 * defaulted to 0, printing "Pending claude/* branches: 0" while hundreds of
 * branches carried unpicked work. Unparseable output must read as unknown
 * (null), never as all-clear (0).
 */
describe("parsePendingCount", () => {
  it("counts pending branches from valid inventory JSON", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toBe(2)
  })

  it("returns 0 for a genuinely empty pending list", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null for empty or missing output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount(null)).toBeNull()
  })

  it("returns null when pending is not an array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ ok: true }))).toBeNull()
  })
})
