import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

/**
 * Guards for .github/workflows/drain-integrator.yml — the platform-independent
 * fallback that fast-forwards main to the integrator when both agent platforms
 * go quiet. A bad edit here pushes unverified (or wrong-branch) code straight
 * to production, so the safety properties are pinned by test:
 *   1. branch + threshold stay in lockstep with scripts/agent-loop-status.mjs
 *   2. fast-forward only — no force push, no merge
 *   3. build + tests run before the push step
 *   4. schedule avoids the Cursor automation slots (:00, :30, :59)
 */

const workflow = readFileSync(
  path.join(process.cwd(), ".github/workflows/drain-integrator.yml"),
  "utf-8"
)
const statusScript = readFileSync(
  path.join(process.cwd(), "scripts/agent-loop-status.mjs"),
  "utf-8"
)

describe("drain-integrator workflow guard", () => {
  it("targets the same integrator branch as agent-loop-status.mjs", () => {
    const workflowBranch = workflow.match(/INTEGRATOR:\s*(\S+)/)?.[1]
    const scriptBranch = statusScript
      .match(/const INTEGRATOR = "origin\/(\S+)"/)?.[1]
    expect(workflowBranch).toBeTruthy()
    expect(workflowBranch).toBe(scriptBranch)
  })

  it("uses the same catch-up threshold as agent-loop-status.mjs", () => {
    const workflowThreshold = workflow.match(/CATCHUP_THRESHOLD:\s*(\d+)/)?.[1]
    const scriptThreshold = statusScript.match(
      /AGENT_CATCHUP_THRESHOLD \?\? "(\d+)"/
    )?.[1]
    expect(workflowThreshold).toBeTruthy()
    expect(workflowThreshold).toBe(scriptThreshold)
  })

  it("only ever fast-forwards — no force push, no forced refspec, no merge", () => {
    expect(workflow).not.toMatch(/--force/)
    expect(workflow).not.toMatch(/push[^\n]*"\+/) // forced refspec like "+sha:main"
    expect(workflow).not.toMatch(/git merge(?!-base)/)
    // Both the decide step and the push step must gate on ancestry.
    const ancestryChecks = workflow.match(/merge-base --is-ancestor/g) ?? []
    expect(ancestryChecks.length).toBeGreaterThanOrEqual(2)
  })

  it("verifies build and tests before the push step", () => {
    const buildAt = workflow.indexOf("npm run build")
    const testAt = workflow.indexOf("npx vitest run")
    const pushAt = workflow.indexOf("git push origin")
    expect(buildAt).toBeGreaterThan(-1)
    expect(testAt).toBeGreaterThan(-1)
    expect(pushAt).toBeGreaterThan(testAt)
    expect(pushAt).toBeGreaterThan(buildAt)
  })

  it("schedules clear of the Cursor automation slots (:00, :30, :59)", () => {
    const minute = workflow.match(/cron:\s*"(\d+) \* \* \* \*"/)?.[1]
    expect(minute).toBeTruthy()
    expect(["0", "30", "59"]).not.toContain(minute)
  })

  it("never overlaps itself (concurrency group, no cancel mid-drain)", () => {
    expect(workflow).toMatch(/concurrency:/)
    expect(workflow).toMatch(/cancel-in-progress: false/)
  })
})
