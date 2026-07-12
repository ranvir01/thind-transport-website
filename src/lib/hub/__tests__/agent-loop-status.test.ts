import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { collectPending, describePending } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once shelled out to `agent-branch-inventory --json`
 * and swallowed any subprocess/parse failure into a pending count of 0, so it
 * reported "Pending claude/* branches: 0" while agent:branches showed 200+.
 * The count now comes from buildInventory imported directly, and any failure
 * must surface as UNKNOWN — never as a confident 0.
 */
describe("collectPending", () => {
  it("reports the inventory row count on success", () => {
    const rows = [{ branch: "claude/a" }, { branch: "claude/b" }]
    expect(collectPending(() => rows)).toEqual({ ok: true, count: 2 })
  })

  it("passes pendingOnly so merged branches are excluded", () => {
    let seen: unknown
    collectPending((opts: unknown) => {
      seen = opts
      return []
    })
    expect(seen).toEqual({ pendingOnly: true })
  })

  it("a throwing inventory becomes ok:false, not count 0", () => {
    const result = collectPending(() => {
      throw new Error("git blew up\nstack noise")
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBe("git blew up")
    expect(result).not.toHaveProperty("count")
  })

  it("a non-array inventory result is a failure, not count 0", () => {
    const result = collectPending(() => null)
    expect(result.ok).toBe(false)
    expect(result.error).toContain("non-array")
  })
})

describe("describePending", () => {
  it("prints the count when the inventory ran", () => {
    expect(describePending({ ok: true, count: 187 })).toBe(
      "Pending claude/* branches (not on main): 187"
    )
    expect(describePending({ ok: true, count: 0 })).toBe(
      "Pending claude/* branches (not on main): 0"
    )
  })

  it("prints UNKNOWN with the reason when the inventory failed", () => {
    const line = describePending({ ok: false, error: "git blew up" })
    expect(line).toContain("UNKNOWN")
    expect(line).toContain("git blew up")
    expect(line).not.toMatch(/:\s*0\b/)
  })
})
