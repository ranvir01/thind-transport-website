import { readFileSync } from "node:fs"
import { join } from "node:path"
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
 * Regression: agent:status once reported "Pending claude/* branches: 0" while
 * agent:branches listed 200+. Two causes, both guarded here:
 * 1. the inventory's --json path called process.exit() right after console.log,
 *    truncating piped stdout (~64KB) before the async flush completed;
 * 2. the status script's JSON.parse catch swallowed the resulting error to 0.
 */
describe("parsePendingCount", () => {
  it("returns the pending array length for valid JSON", () => {
    expect(parsePendingCount(JSON.stringify({ pending: [] }))).toBe(0)
    expect(parsePendingCount(JSON.stringify({ pending: [{ branch: "a" }, { branch: "b" }] }))).toBe(2)
  })

  it("returns null (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: Array.from({ length: 260 }, (_, i) => ({ branch: `b${i}` })) })
    expect(parsePendingCount(full.slice(0, Math.floor(full.length / 2)))).toBeNull()
  })

  it("returns null when the pending key is missing or not an array", () => {
    expect(parsePendingCount("{}")).toBeNull()
    expect(parsePendingCount(JSON.stringify({ pending: 5 }))).toBeNull()
  })

  it("inventory script never calls process.exit (it truncates piped stdout)", () => {
    const src = readFileSync(join(process.cwd(), "scripts/agent-branch-inventory.mjs"), "utf-8")
    expect(src).not.toMatch(/process\.exit\(/)
  })
})
