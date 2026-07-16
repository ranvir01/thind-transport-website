import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { parsePendingCount } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0" while
 * agent:branches showed 217. The inventory child process.exit()ed before its
 * piped stdout flushed, agent-loop-status got truncated JSON, and a bare
 * catch defaulted the count to 0 — a plausible number nobody questioned.
 * parsePendingCount must throw on anything malformed so the caller reports
 * UNKNOWN instead of a fake zero.
 */
describe("parsePendingCount", () => {
  it("counts pending branches from well-formed inventory JSON", () => {
    const json = JSON.stringify({
      integrator: "origin/claude/hauldesk-project-setup-l1luoo",
      main: "origin/main",
      pending: [{ branch: "claude/a" }, { branch: "claude/b" }],
    })
    expect(parsePendingCount(json)).toBe(2)
  })

  it("returns 0 for an empty pending list", () => {
    expect(parsePendingCount('{"pending": []}')).toBe(0)
  })

  it("throws on truncated JSON instead of returning 0", () => {
    const full = JSON.stringify({ pending: [{ branch: "claude/a", subject: "some work" }] })
    const truncated = full.slice(0, full.length - 20)
    expect(() => parsePendingCount(truncated)).toThrow()
  })

  it("throws when pending[] is missing or not an array", () => {
    expect(() => parsePendingCount("{}")).toThrow(/pending/)
    expect(() => parsePendingCount('{"pending": 5}')).toThrow(/pending/)
  })
})
