import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount, pendingMismatchWarning } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: the inventory's --json payload arrived truncated over the pipe
 * (process.exit dropped async stdout writes) and the status script's parse
 * swallowed the error to 0 — "Pending claude/* branches: 0" while 200+ were
 * actually pending. Unknown must stay distinguishable from zero, and a
 * zero/unknown count against a nonzero raw branch count must warn loudly.
 */
describe("parsePendingCount", () => {
  it("returns the pending array length for valid payloads", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
    expect(parsePendingCount(JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] }))).toBe(2)
  })

  it("returns null (not 0) for empty or whitespace output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("   \n")).toBeNull()
    expect(parsePendingCount(undefined)).toBeNull()
  })

  it("returns null for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/x" }, { branch: "claude/y" }] }, null, 2)
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({}))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })
})

describe("pendingMismatchWarning", () => {
  it("warns when the count is unknown", () => {
    expect(pendingMismatchWarning(null, 217)).toMatch(/could not be parsed/)
    expect(pendingMismatchWarning(null, 0)).toMatch(/could not be parsed/)
  })

  it("warns when inventory says 0 but raw unmerged branches exist", () => {
    expect(pendingMismatchWarning(0, 217)).toMatch(/reports 0 pending but 217/)
  })

  it("stays quiet when counts are consistent", () => {
    expect(pendingMismatchWarning(0, 0)).toBeNull()
    expect(pendingMismatchWarning(12, 200)).toBeNull()
    expect(pendingMismatchWarning(337, 337)).toBeNull()
  })
})
