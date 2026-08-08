import { describe, it, expect } from "vitest"
import { parsePendingCount, assessLoop } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0"
 * while agent:branches listed 200+. The inventory child truncated its JSON
 * mid-pipe (process.exit after a large console.log) and the status script's
 * bare catch turned the parse failure into a silent 0. parsePendingCount
 * must THROW on anything it can't fully trust — the caller reports UNKNOWN,
 * never 0.
 */
describe("parsePendingCount", () => {
  const doc = (pending: unknown) =>
    JSON.stringify({ integrator: "origin/claude/x", main: "origin/main", pending }, null, 2)

  it("returns the pending array length on a well-formed document", () => {
    expect(parsePendingCount(doc([]))).toBe(0)
    expect(parsePendingCount(doc([{ branch: "claude/a" }, { branch: "claude/b" }]))).toBe(2)
  })

  it("throws on truncated JSON instead of returning 0", () => {
    const full = doc([{ branch: "claude/a" }, { branch: "claude/b" }])
    const truncated = full.slice(0, Math.floor(full.length / 2))
    expect(() => parsePendingCount(truncated)).toThrow()
  })

  it("throws when the pending array is missing or not an array", () => {
    expect(() => parsePendingCount(JSON.stringify({ integrator: "x", main: "y" }))).toThrow(
      /pending/
    )
    expect(() => parsePendingCount(doc("314"))).toThrow(/pending/)
  })

  it("throws on empty output (child died before writing)", () => {
    expect(() => parsePendingCount("")).toThrow()
  })
})

/**
 * Regression: during the July 2026 fleet stall the integrator branch sat
 * 6 days without a commit at ZERO drift vs main (nothing merged → nothing
 * to drain) while 300+ claude/* branches waited, and agent:status printed
 * STEADY STATE the whole time. The verdict must also consider how long ago
 * the integrator last moved when work is pending.
 */
describe("assessLoop", () => {
  const base = { integratorAhead: 0, integratorAgeHours: 1, pendingCount: 0, threshold: 3, stallHours: 24 }

  it("is STEADY when drift is within threshold and the integrator moved recently", () => {
    const v = assessLoop(base)
    expect(v.mode).toBe("STEADY")
    expect(v.exitCode).toBe(0)
  })

  it("is CATCH_UP (exit 1) when the integrator is ahead of main beyond threshold", () => {
    const v = assessLoop({ ...base, integratorAhead: 7 })
    expect(v.mode).toBe("CATCH_UP")
    expect(v.exitCode).toBe(1)
  })

  it("is STALLED (exit 2) when the integrator is old and branches are waiting, even at 0 drift", () => {
    const v = assessLoop({ ...base, integratorAgeHours: 140, pendingCount: 315 })
    expect(v.mode).toBe("STALLED")
    expect(v.exitCode).toBe(2)
    expect(v.message).toMatch(/315/)
  })

  it("treats an UNKNOWN pending count as work-may-be-waiting, not as 0", () => {
    const v = assessLoop({ ...base, integratorAgeHours: 140, pendingCount: null })
    expect(v.mode).toBe("STALLED")
    expect(v.message).toMatch(/UNKNOWN/)
  })

  it("stays STEADY when the integrator is old but nothing is waiting (quiet repo)", () => {
    const v = assessLoop({ ...base, integratorAgeHours: 140, pendingCount: 0 })
    expect(v.mode).toBe("STEADY")
  })

  it("prefers CATCH_UP over STALLED when both hold (drain is the more urgent action)", () => {
    const v = assessLoop({ ...base, integratorAhead: 10, integratorAgeHours: 140, pendingCount: 5 })
    expect(v.mode).toBe("CATCH_UP")
  })

  it("skips the stall check when the integrator age is unavailable", () => {
    const v = assessLoop({ ...base, integratorAgeHours: null, pendingCount: 12 })
    expect(v.mode).toBe("STEADY")
  })
})
