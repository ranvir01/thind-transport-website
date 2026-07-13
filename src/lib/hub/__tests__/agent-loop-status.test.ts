import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingInventory } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json used to process.exit() right
 * after console.log, truncating large JSON on a pipe. agent:status then
 * swallowed the parse error to 0 and reported "Pending claude/* branches: 0"
 * while the inventory itself listed 200+. parsePendingInventory must throw
 * on anything malformed instead of coercing failure to zero.
 */
describe("parsePendingInventory", () => {
  const valid = JSON.stringify({
    integrator: "origin/claude/hauldesk-project-setup-l1luoo",
    main: "origin/main",
    pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
  })

  it("returns the pending count from valid inventory JSON", () => {
    expect(parsePendingInventory(valid)).toBe(2)
  })

  it("returns 0 only for a genuinely empty pending list", () => {
    expect(parsePendingInventory(JSON.stringify({ pending: [] }))).toBe(0)
  })

  it("throws on truncated JSON instead of returning 0", () => {
    expect(() => parsePendingInventory(valid.slice(0, valid.length - 15))).toThrow()
  })

  it("throws on empty output instead of returning 0", () => {
    expect(() => parsePendingInventory("")).toThrow()
  })

  it("throws when pending[] is missing or not an array", () => {
    expect(() => parsePendingInventory(JSON.stringify({ main: "origin/main" }))).toThrow(
      /no pending\[\] array/
    )
    expect(() => parsePendingInventory(JSON.stringify({ pending: 7 }))).toThrow(/no pending\[\] array/)
  })
})
