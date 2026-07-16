import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { countUnpickedFromCherry } from "../../../../scripts/agent-branch-inventory.mjs"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * git cherry polarity: "+" = commit NOT in upstream (unpicked work the
 * integrator must merge), "-" = patch-equivalent commit already landed.
 * Regression: the inventory once counted "-" as unpicked, so the integrator
 * re-merged already-landed branches and hid genuinely new session branches.
 */
describe("countUnpickedFromCherry", () => {
  it("counts + lines (not yet on main) as unpicked", () => {
    expect(countUnpickedFromCherry("+ abc123")).toBe(1)
    expect(countUnpickedFromCherry("+ abc123\n+ def456")).toBe(2)
  })

  it("does not count - lines (already picked to main)", () => {
    expect(countUnpickedFromCherry("- abc123")).toBe(0)
    expect(countUnpickedFromCherry("- abc123\n- def456")).toBe(0)
  })

  it("mixed output counts only the + lines", () => {
    expect(countUnpickedFromCherry("- landed1\n+ fresh1\n- landed2\n+ fresh2\n+ fresh3")).toBe(3)
  })

  it("empty output means nothing unpicked", () => {
    expect(countUnpickedFromCherry("")).toBe(0)
  })
})

/**
 * Regression: agent-branch-inventory's --json output got truncated mid-pipe
 * (process.exit before stdout flushed) and agent-loop-status's bare catch
 * turned the parse failure into "0 pending" while 217 branches were pending.
 * Unparsable payloads must surface as null (unknown), never as 0.
 */
describe("parsePendingCount", () => {
  const payload = (pending: unknown) => JSON.stringify({ integrator: "i", main: "m", pending })

  it("counts pending branches from valid JSON", () => {
    expect(parsePendingCount(payload([]))).toBe(0)
    expect(parsePendingCount(payload([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("returns null, not 0, for truncated JSON", () => {
    const full = payload([{ branch: "claude/a" }, { branch: "claude/b" }])
    expect(parsePendingCount(full.slice(0, full.length - 20))).toBeNull()
  })

  it("returns null for empty or non-JSON output", () => {
    expect(parsePendingCount("")).toBeNull()
    expect(parsePendingCount("fatal: not a git repository")).toBeNull()
  })

  it("returns null when pending is missing or not an array", () => {
    expect(parsePendingCount(JSON.stringify({ integrator: "i", main: "m" }))).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 217 }))).toBeNull()
  })
})
