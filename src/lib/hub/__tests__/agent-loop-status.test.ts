import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent-branch-inventory --json used to process.exit() right
 * after console.log, truncating the async pipe write mid-payload. The old
 * loop-status parser swallowed the JSON.parse failure and reported
 * "Pending claude/* branches: 0" while 203 branches held unpicked work —
 * so agents kept re-authoring fixes that were already done and queued.
 * Malformed JSON must read as UNKNOWN (null), never as zero.
 */
describe("parsePendingCount", () => {
  const payload = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending }, null, 2)

  it("counts pending branches in a well-formed payload", () => {
    expect(parsePendingCount(payload([]))).toBe(0)
    expect(parsePendingCount(payload([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("returns null — not 0 — for truncated JSON (the stalled-integrator bug)", () => {
    const full = payload([{ branch: "claude/a" }, { branch: "claude/b" }])
    const truncated = full.slice(0, Math.floor(full.length / 2))
    expect(parsePendingCount(truncated)).toBeNull()
  })

  it("returns null for empty or garbage output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("fatal: not a git repository")).toBeNull()
  })

  it("treats a payload with no pending array as zero, not unknown", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "x", main: "y" }))).toBe(0)
  })
})
