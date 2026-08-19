import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

/**
 * Guards for .github/workflows/fleet-liveness.yml — the alarm that fires when
 * the integrator is dead while claude/* work waits. A bad edit here either
 * pages on catch-up (noise — drain already owns that) or stays green through
 * another three-week outage.
 */

const workflow = readFileSync(
  path.join(process.cwd(), ".github/workflows/fleet-liveness.yml"),
  "utf-8"
)
const statusScript = readFileSync(
  path.join(process.cwd(), "scripts/agent-loop-status.mjs"),
  "utf-8"
)
const interop = readFileSync(
  path.join(process.cwd(), "docs/ops/AGENT_INTEROP.md"),
  "utf-8"
)

describe("fleet-liveness workflow guard", () => {
  it("runs agent-loop-status.mjs, not a reimplemented stall check", () => {
    expect(workflow).toMatch(/node scripts\/agent-loop-status\.mjs/)
    expect(statusScript).toMatch(/exitCode: 2/)
  })

  it("fails the job on stall (exit 2) and treats catch-up (exit 1) as OK", () => {
    expect(workflow).toContain('[ "$code" -eq 2 ]')
    expect(workflow).toContain('[ "$code" -eq 1 ]')
    const stallIf = workflow.indexOf('[ "$code" -eq 2 ]')
    const catchupIf = workflow.indexOf('[ "$code" -eq 1 ]')
    const stallExit = workflow.indexOf("exit 1", stallIf)
    const catchupExit = workflow.indexOf("exit 0", catchupIf)
    expect(stallIf).toBeGreaterThan(-1)
    expect(catchupIf).toBeGreaterThan(stallIf)
    expect(stallExit).toBeGreaterThan(stallIf)
    expect(stallExit).toBeLessThan(catchupIf)
    expect(catchupExit).toBeGreaterThan(catchupIf)
  })

  it("schedules at :10 UTC, clear of integrator/drain/smoke/deploy/Claude slots", () => {
    const minute = workflow.match(/cron:\s*"(\d+) \* \* \* \*"/)?.[1]
    expect(minute).toBe("10")
    for (const taken of ["0", "17", "30", "43", "47", "59"]) {
      expect(minute).not.toBe(taken)
    }
  })

  it("is listed on the AGENT_INTEROP clock", () => {
    expect(interop).toMatch(/`:10`/)
    expect(interop).toMatch(/Fleet liveness/)
  })

  it("keeps Sunday reaper and cursor session branches on the interop contract", () => {
    expect(interop).toMatch(/06:00 Sun/)
    expect(interop).toMatch(/cursor\/<session-name>/)
  })

  it("does not write git history", () => {
    expect(workflow).toMatch(/permissions:\s*\n\s+contents:\s+read/)
    expect(workflow).not.toMatch(/git push/)
  })
})
