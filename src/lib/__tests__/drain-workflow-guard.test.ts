import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

/**
 * Guards for .github/workflows/drain-integrator.yml — the platform-independent
 * fallback that drains the integrator to main when both agent platforms go
 * quiet. A bad edit here pushes unverified (or wrong-branch) code straight to
 * production, so the safety properties are pinned by test:
 *   1. branch + threshold stay in lockstep with scripts/agent-loop-status.mjs
 *   2. build + tests run before the drain step
 *   3. schedule avoids the Cursor automation slots (:00, :30, :59)
 *
 * The merge-form invariant (--no-ff + .drain-stamp, never a bare fast-forward
 * ref push) is covered by drain-merge-guard.test.ts — that fast-forward form
 * was the pre-2026-07-19 design and is deliberately NOT re-asserted here.
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
    const scriptBranch = statusScript.match(/const INTEGRATOR = "origin\/(\S+)"/)?.[1]
    expect(workflowBranch).toBeTruthy()
    expect(workflowBranch).toBe(scriptBranch)
  })

  it("uses the same catch-up threshold as agent-loop-status.mjs", () => {
    const workflowThreshold = workflow.match(/AGENT_CATCHUP_THRESHOLD:\s*"(\d+)"/)?.[1]
    const scriptThreshold = statusScript.match(/AGENT_CATCHUP_THRESHOLD \?\? "(\d+)"/)?.[1]
    expect(workflowThreshold).toBeTruthy()
    expect(workflowThreshold).toBe(scriptThreshold)
  })

  it("verifies build and tests before draining", () => {
    const buildAt = workflow.indexOf("npm run build")
    const testAt = workflow.indexOf("npx vitest run")
    const drainAt = workflow.indexOf("Merge integrator into main")
    expect(buildAt).toBeGreaterThan(-1)
    expect(testAt).toBeGreaterThan(-1)
    expect(drainAt).toBeGreaterThan(testAt)
    expect(drainAt).toBeGreaterThan(buildAt)
  })

  it("gives Verify integrator the postgres service the isolation proofs require", () => {
    // Learned 2026-08-30 (run 33332732044): CI=true + no POSTGRES_URL made
    // portal-isolation / driver-file-isolation / cross-tenant-harness throw
    // and skipped the merge. Do not regress to a green-looking skip.
    expect(workflow).toMatch(/image:\s*postgres:16/)
    expect(workflow).toMatch(
      /POSTGRES_URL:\s*postgres:\/\/hubapp:hubpass@localhost:5432\/hubdb/
    )
    const verify = workflow.split("name: Verify integrator")[1]?.split("name: Merge integrator")[0] ?? ""
    const migrateAt = verify.indexOf("npm run db:migrate")
    const seedAt = verify.indexOf("npm run seed:demo")
    const testAt = verify.indexOf("npx vitest run")
    expect(migrateAt).toBeGreaterThan(-1)
    expect(seedAt).toBeGreaterThan(-1)
    expect(seedAt).toBeGreaterThan(migrateAt)
    expect(testAt).toBeGreaterThan(seedAt)
  })

  it("only drains a linear (non-diverged) integrator", () => {
    expect(workflow).toMatch(/merge-base --is-ancestor/)
  })

  it("schedules clear of the Cursor automation slots (:00, :30, :59)", () => {
    const minutes = workflow.match(/cron:\s*"([\d,]+) \* \* \* \*"/)?.[1]?.split(",") ?? []
    expect(minutes.length).toBeGreaterThan(0)
    for (const m of minutes) expect(["0", "30", "59"]).not.toContain(m)
  })

  it("never overlaps itself (concurrency group, no cancel mid-drain)", () => {
    expect(workflow).toMatch(/concurrency:/)
    expect(workflow).toMatch(/cancel-in-progress: false/)
  })
})
