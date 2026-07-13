import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { buildInventory, countUnpickedFromCherry } from "../../../../scripts/agent-branch-inventory.mjs"

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
 * agent-loop-status.mjs imports buildInventory to count pending branches
 * in-process. Regression: it used to shell out with --json and parse stdout,
 * but a process.exit after console.log truncated piped output >64KB, so the
 * swallowed parse error reported "0 pending" while 200+ branches existed.
 */
describe("buildInventory export contract", () => {
  it("is exported as a function for in-process use by agent-loop-status", () => {
    expect(typeof buildInventory).toBe("function")
  })
})
