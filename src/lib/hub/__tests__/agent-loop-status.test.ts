import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { readPendingCount } from "../../../../scripts/agent-loop-status.mjs"

function inventoryJson(branches: string[]): string {
  return JSON.stringify(
    {
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: branches.map((branch) => ({ branch, unpickedOnMain: 1 })),
    },
    null,
    2
  )
}

/**
 * Regression: agent-branch-inventory --json output got truncated mid-document
 * when piped (process.exit dropped the unflushed stdout tail), and status
 * swallowed the JSON.parse error to a count of 0 — reporting "0 pending"
 * while the inventory listed 200+ branches. Status must never turn bad
 * input into a confident zero.
 */
describe("readPendingCount", () => {
  it("counts pending branches from well-formed inventory JSON", () => {
    expect(readPendingCount(inventoryJson([]))).toEqual({ count: 0 })
    expect(readPendingCount(inventoryJson(["claude/a", "claude/b"]))).toEqual({ count: 2 })
  })

  it("reports an error, not 0, for truncated JSON", () => {
    const truncated = inventoryJson(["claude/a", "claude/b", "claude/c"]).slice(0, 80)
    const result = readPendingCount(truncated)
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/unparseable/)
  })

  it("reports an error when the pending array is missing", () => {
    const result = readPendingCount(JSON.stringify({ main: "origin/main" }))
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/no pending array/)
  })

  it("mismatch guard: parsed count must agree with raw branch entries", () => {
    // A reshaped payload where entries moved out of pending — parse would
    // "succeed" with 1 while the document clearly describes 3 branches.
    const reshaped = JSON.stringify({
      pending: [{ branch: "claude/a" }],
      archived: [{ branch: "claude/b" }, { branch: "claude/c" }],
    })
    const result = readPendingCount(reshaped)
    expect(result.count).toBeUndefined()
    expect(result.error).toMatch(/disagrees/)
  })
})
