import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

/**
 * D-003 answered: four scheduled Cursor builders are import-ready on Grok 4.6.
 * D-006 unanswered: Integrator / Prod Smoke / Deploy stay disabled.
 * Claude twins (marketing / deep-verify / meta-governor / red-team) stay
 * unimported. CURSOR-START.md is the owner click pack — a schedule that
 * exists only on a dashboard is invisible to every other agent.
 */

const ROOT = process.cwd()
const AUTO = path.join(ROOT, ".cursor/automation")
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf-8")
const readAuto = (file: string) => readFileSync(path.join(AUTO, file), "utf-8")

const SAFE_LANES = [
  {
    slug: "office",
    cron: "13 5 * * *",
    branch: "claude/lane-office",
    prompt: "loadoff-build-office.prompt.md",
    workflow: "loadoff-build-office.workflow.json",
  },
  {
    slug: "driver",
    cron: "13 8 * * *",
    branch: "claude/lane-driver",
    prompt: "loadoff-build-driver-portal.prompt.md",
    workflow: "loadoff-build-driver-portal.workflow.json",
  },
  {
    slug: "tests",
    cron: "13 11 * * *",
    branch: "claude/lane-tests",
    prompt: "loadoff-build-tests.prompt.md",
    workflow: "loadoff-build-tests.workflow.json",
  },
  {
    slug: "integrations",
    cron: "13 14 * * *",
    branch: "claude/lane-integrations",
    prompt: "loadoff-build-integrations.prompt.md",
    workflow: "loadoff-build-integrations.workflow.json",
  },
] as const

const DISABLED_MECHANICAL = [
  "880eec29-78fd-11f1-ba66-0e7d0216e441",
  "4ad7743c-7900-11f1-ba66-0e7d0216e441",
  "75e8fbf5-7900-11f1-ba66-0e7d0216e441",
] as const

describe("cursor automation pack (CURSOR-START + four import-ready lanes)", () => {
  it("ships CURSOR-START and the four builder files", () => {
    expect(existsSync(path.join(ROOT, "docs/ops/CURSOR-START.md"))).toBe(true)
    for (const lane of SAFE_LANES) {
      expect(existsSync(path.join(AUTO, lane.prompt)), lane.prompt).toBe(true)
      expect(existsSync(path.join(AUTO, lane.workflow)), lane.workflow).toBe(true)
    }
  })

  it("pins Grok 4.6, the reserved crons, and the lane branches", () => {
    for (const lane of SAFE_LANES) {
      const wf = JSON.parse(readAuto(lane.workflow)) as {
        workflow: { model: string; gitConfig: { repo: string; branch: string } }
      }
      expect(wf.workflow.model, lane.workflow).toBe("cursor-grok-4.6-high-fast")
      expect(wf.workflow.gitConfig.repo).toBe("ranvir01/thind-transport-website")
      expect(wf.workflow.gitConfig.branch).toBe(lane.branch)
      expect(readAuto(lane.workflow)).toContain(`"cron": "${lane.cron}"`)
    }
  })

  it("each builder prompt takes should-issues first, dedupes cursor/* PRs, and never merges", () => {
    for (const lane of SAFE_LANES) {
      const prompt = readAuto(lane.prompt)
      const json = readAuto(lane.workflow)
      for (const body of [prompt, json]) {
        expect(body, lane.prompt).toMatch(/should/)
        expect(body, lane.prompt).toMatch(/Closes #N/)
        expect(body, lane.prompt).toMatch(/agent:status/)
        expect(body, lane.prompt).toMatch(/git:identity/)
        expect(body, lane.prompt).toMatch(/never merge/i)
        expect(body, lane.prompt).toMatch(/cursor\/\*/)
      }
      expect(prompt).toMatch(/scheduled lane/)
      expect(prompt).toMatch(/6\/week/)
      expect(prompt).toMatch(/cursor-agent-preamble/)
    }
  })

  it("CURSOR-START imports the four, skips Claude twins, and leaves D-006 disabled", () => {
    const start = read("docs/ops/CURSOR-START.md")
    expect(start).toMatch(/Ranvir's yes|owner click|yes for the four/i)
    expect(start).toMatch(/05:13/)
    expect(start).toMatch(/08:13/)
    expect(start).toMatch(/11:13/)
    expect(start).toMatch(/14:13/)
    expect(start).toMatch(/Do not import|skip/i)
    expect(start).toMatch(/marketing/)
    expect(start).toMatch(/deep-verify/)
    expect(start).toMatch(/meta-governor/)
    expect(start).toMatch(/red-team/)
    expect(start).toMatch(/D-006/)
    expect(start).toMatch(/DISABLED/)
    expect(start).toMatch(/Untitled/)
    expect(start).toMatch(/5241c374-0579-442f-bf88-309dbcbe37f3/)
    expect(start).toMatch(/cursor-grok-4\.6-high-fast/)
    expect(start).toMatch(/Fire Cursor/)
    for (const id of DISABLED_MECHANICAL) {
      expect(start).toContain(id)
    }
  })

  it("automation README and fleet docs point at CURSOR-START", () => {
    expect(read(".cursor/automation/README.md")).toMatch(/CURSOR-START/)
    expect(read("docs/ops/FLEET.md")).toMatch(/CURSOR-START/)
    expect(read("docs/ops/AGENT_INTEROP.md")).toMatch(/CURSOR-START/)
    expect(read("docs/ops/OWNER-WORKSHEET.md")).toMatch(/CURSOR-START/)
    expect(read("docs/ops/OWNER-CONTEXT.md")).toMatch(/CURSOR-START/)
    expect(read("docs/cursor-agent-preamble.md")).toMatch(/CURSOR-START/)
    expect(read("docs/grok-bots/SETUP.md")).toMatch(/CURSOR-START/)
    expect(read("docs/grok-bots/GOGO-START.md")).toMatch(/CURSOR-START/)
    expect(read("docs/grok-bots/templates/fire-cursor.md")).toMatch(/CURSOR-START/)
    expect(read("docs/grok-bots/em-engmgr.instructions.md")).toMatch(/CURSOR-START/)
  })

  it("README still forbids importing Claude twins and re-enabling Untitled", () => {
    const readme = read(".cursor/automation/README.md")
    expect(readme).toMatch(/Do not import/)
    expect(readme).toMatch(/marketing/)
    expect(readme).toMatch(/deep-verify/)
    expect(readme).toMatch(/meta-governor/)
    expect(readme).toMatch(/Untitled/)
    expect(readme).toMatch(/D-006/)
    expect(readme).toMatch(/cursor-grok-4\.6-high-fast/)
  })
})
