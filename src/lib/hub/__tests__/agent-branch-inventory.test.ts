import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { countUnpickedFromCherry } from "../../../../scripts/agent-branch-inventory.mjs"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { formatPendingSummary } from "../../../../scripts/agent-loop-status.mjs"

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
 * Regression: agent:status once shelled out to the inventory and JSON.parsed
 * the output with a bare catch, so any failure collapsed to "0 pending" while
 * agent:branches showed hundreds. The summary is now built from an in-process
 * inventory call, and a 0 answer must be verifiable (patch-equivalence note)
 * rather than a bare number.
 */
describe("formatPendingSummary", () => {
  it("reports pending branches and points at agent:branches", () => {
    const lines = formatPendingSummary([
      { onMain: false, aheadMain: 3 },
      { onMain: false, aheadMain: 1 },
      { onMain: true, aheadMain: 0 },
    ])
    expect(lines[0]).toBe("Pending claude/* branches (not on main): 2")
    expect(lines[1]).toContain("npm run agent:branches")
  })

  it("explains a 0-pending answer when branches are ahead only in patch-equivalent commits", () => {
    const lines = formatPendingSummary([
      { onMain: true, aheadMain: 4 },
      { onMain: true, aheadMain: 2 },
    ])
    expect(lines[0]).toBe("Pending claude/* branches (not on main): 0")
    expect(lines[1]).toContain("2 branch(es)")
    expect(lines[1]).toContain("patch-equivalent")
  })

  it("plain 0 when nothing is ahead at all", () => {
    const lines = formatPendingSummary([{ onMain: true, aheadMain: 0 }])
    expect(lines).toEqual(["Pending claude/* branches (not on main): 0"])
  })
})
