/**
 * Pins the LoadOff Cursor Automation fleet: three staggered hourly jobs,
 * LoadOff-named prompts, and the npm preflight helpers the prompts call.
 * The July 2026 stall happened because the repo documented the loop but
 * only shipped one HaulDesk-named automation — this test is the ratchet.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const AUTO = path.join(ROOT, ".cursor", "automation")

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf-8")
}

function workflow(name: string) {
  return JSON.parse(read(path.join(".cursor", "automation", name)))
}

describe("LoadOff agent fleet automations", () => {
  it("ships the three LoadOff prompt + workflow pairs", () => {
    for (const stem of ["loadoff-integrator", "loadoff-deploy", "loadoff-prod-smoke"]) {
      expect(existsSync(path.join(AUTO, `${stem}.prompt.md`)), stem).toBe(true)
      expect(existsSync(path.join(AUTO, `${stem}.workflow.json`)), stem).toBe(true)
    }
  })

  it("staggers integrator :00, prod smoke :30, deploy :59 on the right branches", () => {
    const integrator = workflow("loadoff-integrator.workflow.json")
    const smoke = workflow("loadoff-prod-smoke.workflow.json")
    const deploy = workflow("loadoff-deploy.workflow.json")
    expect(integrator.workflow.triggers[0].cron.cron).toBe("0 * * * *")
    expect(integrator.workflow.gitConfig.branch).toBe("claude/hauldesk-project-setup-l1luoo")
    expect(smoke.workflow.triggers[0].cron.cron).toBe("30 * * * *")
    expect(smoke.workflow.gitConfig.branch).toBe("main")
    expect(deploy.workflow.triggers[0].cron.cron).toBe("59 * * * *")
    expect(deploy.workflow.gitConfig.branch).toBe("main")
  })

  it("keeps the old HaulDesk filenames as redirects to loadoff-deploy", () => {
    const prompt = read(".cursor/automation/hauldesk-improvement-cycle.prompt.md")
    expect(prompt).toMatch(/loadoff-deploy\.prompt\.md/)
    const wf = workflow("hauldesk-improvement-cycle.workflow.json")
    expect(String(wf.workflow.prompts[0])).toMatch(/loadoff-deploy/)
    expect(wf.workflow.triggers[0].cron.cron).toBe("59 * * * *")
  })

  it("wires the preflight npm scripts the automations run", () => {
    const pkg = JSON.parse(read("package.json"))
    expect(pkg.scripts["agent:status"]).toBe("node scripts/agent-loop-status.mjs")
    expect(pkg.scripts["agent:backlog"]).toBe("node scripts/collect-backlog.mjs")
    expect(pkg.scripts["prod:smoke"]).toBe("node scripts/prod-smoke.mjs")
  })

  it("deploy prompt carries the 20+ agent guardrails", () => {
    const prompt = read(".cursor/automation/loadoff-deploy.prompt.md")
    expect(prompt).toMatch(/Catch-up beats features/)
    expect(prompt).toMatch(/One commit per run/)
    expect(prompt).toMatch(/empty list is OK/)
    expect(prompt).toMatch(/data-app=hauldesk/)
    expect(prompt).toMatch(/integrator-only/)
  })
})
