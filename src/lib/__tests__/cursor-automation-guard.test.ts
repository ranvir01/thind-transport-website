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

// D-017: portfolio coverage — radar (issues only) + weekly satellite builders.
const PORTFOLIO_SLOTS = [
  {
    slug: "radar",
    cron: "37 9 * * *",
    repo: "ranvir01/thind-transport-website",
    prompt: "portfolio-radar.prompt.md",
    workflow: "portfolio-radar.workflow.json",
  },
  {
    slug: "bls",
    cron: "37 12 * * 3",
    repo: "ranvir01/bls-website",
    prompt: "bls-maintenance.prompt.md",
    workflow: "bls-maintenance.workflow.json",
  },
  {
    slug: "myco",
    cron: "37 12 * * 4",
    repo: "ranvir01/myco-website",
    prompt: "myco-maintenance.prompt.md",
    workflow: "myco-maintenance.workflow.json",
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

  it("ships the D-017 portfolio slots pinned to Grok 4.6 on their own repos", () => {
    for (const slot of PORTFOLIO_SLOTS) {
      expect(existsSync(path.join(AUTO, slot.prompt)), slot.prompt).toBe(true)
      const wf = JSON.parse(readAuto(slot.workflow)) as {
        workflow: { model: string; gitConfig: { repo: string } }
      }
      expect(wf.workflow.model, slot.workflow).toBe("cursor-grok-4.6-high-fast")
      expect(wf.workflow.gitConfig.repo).toBe(slot.repo)
      expect(readAuto(slot.workflow)).toContain(`"cron": "${slot.cron}"`)
    }
  })

  it("the radar is issues-only and the satellite builders act-or-exit, PR-only, owner-authored", () => {
    for (const body of [readAuto("portfolio-radar.prompt.md"), readAuto("portfolio-radar.workflow.json")]) {
      expect(body).toMatch(/issues only|issues-only/i)
      expect(body).toMatch(/never commits?|no commit/i)
      expect(body).toMatch(/exit silently/i)
      expect(body).toMatch(/\[radar\]/)
      expect(body).toMatch(/needs-owner/)
      expect(body).toMatch(/dormant/i)
    }
    for (const file of ["bls-maintenance", "myco-maintenance"] as const) {
      for (const body of [readAuto(`${file}.prompt.md`), readAuto(`${file}.workflow.json`)]) {
        expect(body, file).toMatch(/exit with no PR/i)
        expect(body, file).toMatch(/never merge/i)
        expect(body, file).toMatch(/Never push `?main/i)
        expect(body, file).toMatch(/Closes #N/)
        expect(body, file).toMatch(/Ranvir Thind/)
        expect(body, file).toMatch(/130034150\+ranvir01@users\.noreply\.github\.com/)
        expect(body, file).toMatch(/Backlog:/)
      }
    }
    const bls = readAuto("bls-maintenance.prompt.md")
    expect(bls).toMatch(/Netlify/i)
    expect(bls).toMatch(/Cursor-only/i)
    expect(bls).toMatch(/check:all/)
    const myco = readAuto("myco-maintenance.prompt.md")
    expect(myco).toMatch(/owner-only/i)
    expect(myco).toMatch(/gcloud/i)
    expect(myco).toMatch(/cloudbuild\.yaml/)
  })

  it("CLAUDE-START keeps Claude home-repo-only: the 9 tasks, toggles, deltas, no satellites", () => {
    const start = read("docs/ops/CLAUDE-START.md")
    expect(start).toMatch(/D-007/)
    expect(start).toMatch(/10th task/)
    for (const trig of [
      "trig_01B99W8MteaPtzwk124DFF4w",
      "trig_01CHi6xoyJj6J6gnw61kdM6n",
      "trig_01KkHERF248AGaTKWWn3TnAN",
      "trig_01DRFH6wxq5A42VHyviZrAgz",
      "trig_01VDnAmz6dKpgnXo6pqXNXic",
      "trig_0129DPKKdN2r1SAgkoS7ji9C",
      "trig_01P4PLJiyBp9xqt8i9ikohr6",
      "trig_01QogkHyq7M3RqC5SqznGZLA",
      "trig_01Wq86Kd67ZCgEFYGnEU8sXK",
    ]) {
      expect(start, `missing ${trig}`).toContain(trig)
    }
    expect(start).toMatch(/bls-website/)
    expect(start).toMatch(/Cursor-only/i)
    expect(start).toMatch(/fire-claude\.md/)
    expect(start).toMatch(/CURSOR-START/)
    expect(start).toMatch(/Airtable/)
  })

  it("Fire Claude is a written SOP gated on Em + idle window + home repo", () => {
    const sop = read("docs/grok-bots/templates/fire-claude.md")
    expect(sop).toMatch(/Em/)
    expect(sop).toMatch(/idle/i)
    expect(sop).toMatch(/thind-transport-website/)
    expect(sop).toMatch(/Never for `bls-website`/i)
    expect(sop).toMatch(/never merge/i)
    expect(sop).toMatch(/claude-routine-preamble/)
    expect(sop).toMatch(/9-task/)
  })

  it("CURSOR-START imports the four, skips Claude twins, and leaves D-006 disabled", () => {
    const start = read("docs/ops/CURSOR-START.md")
    expect(start).toMatch(/Ranvir's yes|owner click|yes for the four/i)
    expect(start).toMatch(/05:13/)
    expect(start).toMatch(/08:13/)
    expect(start).toMatch(/11:13/)
    expect(start).toMatch(/14:13/)
    expect(start).toMatch(/09:37/)
    expect(start).toMatch(/12:37/)
    expect(start).toMatch(/D-017/)
    expect(start).toMatch(/CLAUDE-START/)
    expect(start).toMatch(/bls-website/)
    expect(start).toMatch(/myco-website/)
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

  it("the handoff paste keeps future automation agents inside the contract", () => {
    const handoff = read("docs/ops/AUTOMATION-HANDOFF.md")
    expect(handoff).toMatch(/One charter, one platform/i)
    expect(handoff).toMatch(/Do NOT push to cursor\/fleet-24-7-liveness-931f/)
    expect(handoff).toMatch(/cursor-grok-4\.6-high-fast/)
    expect(handoff).toMatch(/PASTE DELTAS/)
    expect(handoff).toMatch(/retire/i)
    expect(handoff).toMatch(/D-006/)
    expect(handoff).toMatch(/D-007/)
    expect(handoff).toMatch(/D-016/)
    expect(handoff).toMatch(/D-017/)
    expect(handoff).toMatch(/CURSOR-START/)
    expect(handoff).toMatch(/CLAUDE-START/)
    expect(handoff).toMatch(/cursor-automation-guard\.test\.ts/)
    expect(handoff).toMatch(/act-or-exit/i)
    expect(handoff).toMatch(/git:identity/)
    expect(handoff).toMatch(/:07\/:13\/:37/)
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
