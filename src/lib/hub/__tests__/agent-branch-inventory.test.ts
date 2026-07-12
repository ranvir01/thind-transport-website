import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { countUnpickedFromCherry, buildInventory } from "../../../../scripts/agent-branch-inventory.mjs"

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
 * Regression: agent:status reported "Pending claude/* branches: 0" while
 * agent:branches showed 217. Root cause was two-part: the inventory's --json
 * path called process.exit() right after console.log — stdout to a pipe is
 * async, so the exit dropped the unflushed tail and consumers received
 * truncated JSON — and agent-loop-status swallowed the parse error to 0.
 * The fix removes process.exit from the inventory and has agent-loop-status
 * call buildInventory() in-process instead of parsing piped JSON.
 */
describe("agent loop status pending-count plumbing", () => {
  const scriptsDir = resolve(__dirname, "../../../../scripts")

  it("inventory exports buildInventory for in-process consumers", () => {
    expect(typeof buildInventory).toBe("function")
  })

  it("inventory never calls process.exit (truncates piped --json stdout)", () => {
    const src = readFileSync(resolve(scriptsDir, "agent-branch-inventory.mjs"), "utf-8")
    expect(src).not.toMatch(/process\.exit\(/)
  })

  it("agent-loop-status counts pending branches in-process, not via piped JSON", () => {
    const src = readFileSync(resolve(scriptsDir, "agent-loop-status.mjs"), "utf-8")
    expect(src).toContain("buildInventory")
    expect(src).not.toMatch(/agent-branch-inventory\.mjs --json/)
  })
})
