import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount, pendingMismatchWarning } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status reported "Pending claude/* branches: 0" while
 * agent:branches showed 217. The inventory's --json payload was truncated at
 * the 64KiB pipe buffer (process.exit before async stdout flush) and the
 * status script's bare catch mapped the parse failure to 0. Failure must
 * surface as null/unknown plus a warning, never as a confident zero.
 */
describe("parsePendingCount", () => {
  it("returns the pending array length for valid payloads", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
    expect(parsePendingCount(JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] }))).toBe(2)
  })

  it("returns null for truncated JSON instead of 0", () => {
    const full = JSON.stringify({ pending: Array.from({ length: 50 }, (_, i) => ({ branch: `b${i}` })) })
    expect(parsePendingCount(full.slice(0, 100))).toBeNull()
  })

  it("returns null when pending[] is missing", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "x" }))).toBeNull()
    expect(parsePendingCount("")).toBeNull()
  })
})

describe("pendingMismatchWarning", () => {
  it("warns when the count is unknown", () => {
    expect(pendingMismatchWarning(null, 0)).toMatch(/unreadable/)
    expect(pendingMismatchWarning(null, 217)).toMatch(/unreadable/)
  })

  it("warns when inventory says 0 but unmerged claude/* branches exist", () => {
    expect(pendingMismatchWarning(0, 217)).toMatch(/217 claude\/\* branch/)
  })

  it("stays quiet when counts agree or inventory found pending work", () => {
    expect(pendingMismatchWarning(0, 0)).toBeNull()
    // unmerged may exceed pending legitimately (cherry patch-equivalence)
    expect(pendingMismatchWarning(3, 217)).toBeNull()
  })
})
