import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once swallowed inventory JSON parse errors to 0, so a
 * truncated `agent-branch-inventory.mjs --json` read (the child's process.exit()
 * dropped un-flushed piped stdout) printed "Pending claude/* branches: 0" while
 * agent:branches showed 200+. A failed read must surface as null (UNKNOWN), never 0.
 */
describe("parsePendingCount", () => {
  const doc = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/hauldesk-project-setup-l1luoo", main: "origin/main", pending })

  it("counts the pending array of a well-formed document", () => {
    expect(parsePendingCount(doc([]))).toBe(0)
    expect(parsePendingCount(doc([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = doc([{ branch: "claude/gallant-dijkstra-59tzfj", aheadMain: 309 }])
    expect(parsePendingCount(full.slice(0, full.length - 40))).toBeNull()
  })

  it("returns null (not 0) for empty output", () => {
    expect(parsePendingCount(""))
      .toBeNull()
  })

  it("returns null when the document has no pending array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "x", main: "y" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: "not-an-array" }))).toBeNull()
  })
})
