import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingInventory } from "../../../../scripts/agent-loop-status.mjs"

const inventory = (pending: unknown[]) =>
  JSON.stringify({ integrator: "origin/claude/hauldesk-project-setup-l1luoo", main: "origin/main", pending }, null, 2)

/**
 * Regression: agent:status once swallowed JSON.parse failures to 0. The
 * inventory's --json output was truncated mid-write (process.exit before
 * stdout drained), so status reported "Pending claude/* branches: 0" while
 * agent:branches listed 217. Malformed input must throw, never read as 0.
 */
describe("parsePendingInventory", () => {
  it("counts pending branches from well-formed inventory JSON", () => {
    expect(parsePendingInventory(inventory([]))).toBe(0)
    expect(parsePendingInventory(inventory([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("throws on truncated JSON instead of defaulting to 0", () => {
    const full = inventory([{ branch: "claude/a" }, { branch: "claude/b" }])
    const truncated = full.slice(0, Math.floor(full.length / 2))
    expect(() => parsePendingInventory(truncated)).toThrow()
  })

  it("throws on empty output", () => {
    expect(() => parsePendingInventory("")).toThrow()
  })

  it("throws when pending[] is missing", () => {
    expect(() => parsePendingInventory(JSON.stringify({ main: "origin/main" }))).toThrow()
  })
})
