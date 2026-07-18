import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status shelled out to agent-branch-inventory --json,
 * whose process.exit() truncated piped stdout at 64KB; the swallowed
 * JSON.parse error then reported "Pending claude/* branches: 0" while
 * agent:branches listed 217. Unreadable output must surface as null
 * (rendered UNKNOWN), never as a fake 0.
 */
describe("parsePendingCount", () => {
  it("counts pending branches in a valid payload", () => {
    const out = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(out)).toBe(2)
  })

  it("returns 0 only for a verified-empty pending array", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null for truncated JSON instead of 0", () => {
    const full = JSON.stringify({ pending: new Array(50).fill({ branch: "claude/x", files: ["a.ts"] }) })
    expect(parsePendingCount(full.slice(0, Math.floor(full.length / 2)))).toBeNull()
  })

  it("returns null for empty output (inventory crashed)", () => {
    expect(parsePendingCount("")).toBeNull()
  })

  it("returns null when the pending array is missing or mis-shaped", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i", main: "m" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: "217" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify(null))).toBeNull()
  })
})
