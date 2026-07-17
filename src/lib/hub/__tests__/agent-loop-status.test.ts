import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingInventory } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once wrapped JSON.parse of the inventory's --json
 * output in a bare catch that defaulted to 0, so a truncated pipe (the
 * inventory used to process.exit() before stdout flushed) reported
 * "Pending claude/* branches: 0" while agent:branches showed 200+.
 * The parser must throw on bad input, never silently return 0.
 */
describe("parsePendingInventory", () => {
  it("returns the pending count from well-formed inventory JSON", () => {
    const raw = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(parsePendingInventory(raw)).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending array", () => {
    expect(parsePendingInventory(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("throws on truncated JSON instead of defaulting to 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    expect(() => parsePendingInventory(truncated)).toThrow()
  })

  it("throws when the pending array is missing or not an array", () => {
    expect(() => parsePendingInventory("{}")).toThrow(/pending/)
    expect(() => parsePendingInventory(JSON.stringify({ pending: "306" }))).toThrow(/pending/)
    expect(() => parsePendingInventory("null")).toThrow(/pending/)
  })

  it("throws on empty output (e.g. the inventory crashed)", () => {
    expect(() => parsePendingInventory("")).toThrow()
  })
})
