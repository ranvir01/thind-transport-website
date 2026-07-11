import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingFromInventoryJson } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json called process.exit() right after
 * console.log, so payloads over 64KB were truncated mid-pipe. agent:status
 * then swallowed the JSON.parse error and reported "Pending claude/*
 * branches: 0" while agent:branches showed 217. The parser must surface an
 * error for anything it can't fully trust — never a silent 0.
 */
describe("parsePendingFromInventoryJson", () => {
  it("returns the pending count for a well-formed payload", () => {
    const out = JSON.stringify({ count: 2, pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingFromInventoryJson(out)).toEqual({ count: 2, error: null })
  })

  it("accepts a zero-pending payload as a real 0", () => {
    const out = JSON.stringify({ count: 0, pending: [] })
    expect(parsePendingFromInventoryJson(out)).toEqual({ count: 0, error: null })
  })

  it("tolerates older payloads without a count field", () => {
    const out = JSON.stringify({ pending: [{ branch: "a" }] })
    expect(parsePendingFromInventoryJson(out)).toEqual({ count: 1, error: null })
  })

  it("errors instead of returning 0 on truncated JSON", () => {
    const full = JSON.stringify({ count: 3, pending: [{ branch: "a" }, { branch: "b" }, { branch: "c" }] })
    const truncated = full.slice(0, Math.floor(full.length / 2))
    const result = parsePendingFromInventoryJson(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/not valid JSON/)
  })

  it("errors on empty output", () => {
    const result = parsePendingFromInventoryJson("")
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/not valid JSON/)
  })

  it("errors when pending[] is missing", () => {
    const result = parsePendingFromInventoryJson(JSON.stringify({ count: 5 }))
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/no pending\[\] array/)
  })

  it("errors when count disagrees with pending[] length (mismatch guard)", () => {
    const out = JSON.stringify({ count: 217, pending: [{ branch: "a" }] })
    const result = parsePendingFromInventoryJson(out)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/217.*does not match.*1/)
  })
})
