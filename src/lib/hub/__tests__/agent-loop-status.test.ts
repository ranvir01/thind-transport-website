import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

const row = (name: string) =>
  `{ "branch": "claude/${name}", "aheadMain": 1, "unpickedOnMain": 1, "onMain": false }`

const report = (names: string[]) =>
  `{ "integrator": "origin/claude/hauldesk-project-setup-l1luoo", "main": "origin/main", "pending": [${names
    .map(row)
    .join(", ")}] }`

/**
 * Regression: agent:status printed "Pending claude/* branches: 0" while
 * agent:branches listed 217. The inventory child exited via process.exit()
 * before its piped stdout flushed, the JSON arrived truncated mid-string,
 * and the status script's bare catch swallowed the parse error to 0.
 * parsePendingCount must never turn a failure into a confident zero.
 */
describe("parsePendingCount", () => {
  it("counts pending rows in a well-formed report", () => {
    expect(parsePendingCount(report([]))).toEqual({ count: 0, error: null })
    expect(parsePendingCount(report(["a", "b", "c"]))).toEqual({ count: 3, error: null })
  })

  it("reports truncated JSON as an error, not zero", () => {
    const truncated = report(["a", "b", "c"]).slice(0, 60)
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/truncated/)
  })

  it("reports a missing pending[] array instead of defaulting to zero", () => {
    const result = parsePendingCount(`{ "integrator": "x", "main": "y" }`)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/pending\[\]/)
  })

  it("flags a row-count mismatch between parsed JSON and raw branch keys", () => {
    // Valid JSON whose pending[] lost a row relative to the raw "branch": keys
    // (e.g. shape drift moving rows out of pending[]).
    const raw = `{ "pending": [${row("a")}], "orphaned": { "branch": "claude/b" } }`
    const result = parsePendingCount(raw)
    expect(result.count).toBe(1)
    expect(result.error).toMatch(/suspect/)
  })
})
