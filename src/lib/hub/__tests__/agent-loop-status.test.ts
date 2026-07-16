import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { pendingCountFromJson } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once swallowed inventory failures into a fake
 * "Pending claude/* branches: 0" while agent:branches showed 217. The
 * inventory's --json payload was truncated (process.exit before the pipe
 * drained) and the catch-all defaulted to 0. The parser must return null —
 * never 0 — for anything but a well-formed payload with a pending array.
 */
describe("pendingCountFromJson", () => {
  it("counts pending branches in a well-formed payload", () => {
    const payload = JSON.stringify({ integrator: "i", main: "m", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(pendingCountFromJson(payload)).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending array", () => {
    expect(pendingCountFromJson(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("returns null for empty output", () => {
    expect(pendingCountFromJson("")).toBeNull()
  })

  it("returns null for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] }, null, 2)
    expect(pendingCountFromJson(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null when the pending key is missing or not an array", () => {
    expect(pendingCountFromJson(JSON.stringify({}))).toBeNull()
    expect(pendingCountFromJson(JSON.stringify({ pending: 5 }))).toBeNull()
    expect(pendingCountFromJson(JSON.stringify(null))).toBeNull()
  })
})
