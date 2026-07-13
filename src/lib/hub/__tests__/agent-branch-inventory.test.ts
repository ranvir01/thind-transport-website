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
 * agent:branches showed 200+ — the inventory JSON arrived truncated over the
 * pipe and the parse failure was silently coerced to 0. Malformed payloads
 * must surface an error, never a fake zero.
 */
describe("parsePendingCount", () => {
  const payload = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending }, null, 2)

  it("counts the pending array on well-formed JSON", () => {
    expect(parsePendingCount(payload([]))).toEqual({ count: 0 })
    expect(parsePendingCount(payload([{ branch: "claude/a" }, { branch: "claude/b" }]))).toEqual({ count: 2 })
  })

  it("returns an error for truncated JSON instead of 0", () => {
    const truncated = payload([{ branch: "claude/a" }]).slice(0, 40)
    const result = parsePendingCount(truncated)
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/not valid JSON/)
  })

  it("returns an error when the pending array is missing", () => {
    expect(parsePendingCount("{}").error).toMatch(/no 'pending' array/)
    expect(parsePendingCount(JSON.stringify({ pending: "nope" })).error).toMatch(/no 'pending' array/)
    expect(parsePendingCount("null").error).toMatch(/no 'pending' array/)
  })
})
