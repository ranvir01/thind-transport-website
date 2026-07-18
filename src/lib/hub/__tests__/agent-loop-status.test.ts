import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0"
 * while agent:branches listed 200+. The inventory subprocess truncated its
 * JSON mid-stream (process.exit before the stdout pipe flushed) and the
 * status script's catch swallowed the parse error to 0 — a broken loop
 * looked like a clean one. parsePendingCount must never turn a failure
 * into a count of 0.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from valid inventory JSON", () => {
    const out = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }, { branch: "claude/c" }],
    })
    expect(parsePendingCount(out)).toEqual({ count: 3, error: null })
  })

  it("returns 0 only for a genuinely empty pending list", () => {
    const out = JSON.stringify({ integrator: "x", main: "y", pending: [] })
    expect(parsePendingCount(out)).toEqual({ count: 0, error: null })
  })

  it("reports an error (not 0) for truncated JSON", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a" }, { branch: "claude/b" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it("reports an error (not 0) for empty output", () => {
    const result = parsePendingCount("")
    expect(result.count).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it("reports an error when pending[] is missing", () => {
    const result = parsePendingCount(JSON.stringify({ integrator: "x", main: "y" }))
    expect(result.count).toBeNull()
    expect(result.error).toBe("inventory JSON has no pending[] array")
  })
})
