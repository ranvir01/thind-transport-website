import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

/**
 * Grok Bot instruction bodies are capped at 4,000 characters (product limit).
 * Files in docs/grok-bots/ are what the owner pastes into the four live Bots
 * (D-010: gogo, Steve, Jeff, Rav — one Big team group, no spawning). Going
 * over the cap silently truncates a charter; losing the "never git push" or
 * the reopen-the-source memory rule turns a watcher into a liability. Also
 * keeps the retired six-title roster (D-008/D-009) from resurfacing.
 */

const DIR = path.join(process.cwd(), "docs/grok-bots")
const LIMIT = 4000
const INSTRUCTION_FILES = [
  "gogo-tpm.instructions.md",
  "steve-deploy-ci.instructions.md",
  "jeff-revops.instructions.md",
  "rav-career-coach.instructions.md",
]

const read = (file: string) => readFileSync(path.join(DIR, file), "utf-8")

describe("grok-bot instruction files (four live bots, paste-ready, ≤4k)", () => {
  it("ships SETUP.md as the one owner file plus the four instruction bodies", () => {
    const names = new Set(readdirSync(DIR))
    expect(names.has("SETUP.md")).toBe(true)
    expect(names.has("README.md")).toBe(true)
    for (const file of INSTRUCTION_FILES) {
      expect(names.has(file), `missing ${file}`).toBe(true)
    }
    // the retired six-title roster must not resurface
    expect(names.has("SPAWN.md")).toBe(false)
    expect(names.has("GROUPS.md")).toBe(false)
    expect(names.has("watcher.instructions.md")).toBe(false)
    expect(names.has("venture-analyst.instructions.md")).toBe(false)
    expect(names.has("eng-comms.instructions.md")).toBe(false)
    expect(names.has("RESEARCH.md")).toBe(true)

    const setup = read("SETUP.md")
    expect(setup).toMatch(/THE FILE/)
    expect(setup).toMatch(/This is that file/)
    expect(setup).toMatch(/D-010/)
    expect(setup).toMatch(/gogo/)
    expect(setup).toMatch(/Steve/)
    expect(setup).toMatch(/Jeff/)
    expect(setup).toMatch(/Rav/)
    expect(setup).toMatch(/Big team/)
    expect(setup).toMatch(/one in-flight SHOULD/i)
    expect(setup).toMatch(/Cursor cloud agent/)
    expect(setup).toMatch(/never merged by Grok/i)
    expect(setup).toMatch(/Netlify/)
    expect(setup).toMatch(/8:30pm PT/)
    expect(setup).toMatch(/needsAuth/)
    expect(setup).toMatch(/thindcarrier/)
    expect(setup).toMatch(/atstransport24/)
    expect(setup).toMatch(/Form 2290/)
    expect(setup).toMatch(/save this method as\s+a skill/i)
    expect(setup).toMatch(/reports? and stops?/i)
    expect(setup).toMatch(/memory is not the record/i)
    expect(setup).toMatch(/gogo-tpm\.instructions\.md/)
    expect(setup).toMatch(/steve-deploy-ci\.instructions\.md/)
    expect(setup).toMatch(/jeff-revops\.instructions\.md/)
    expect(setup).toMatch(/rav-career-coach\.instructions\.md/)
    expect(setup).toMatch(/\/workspace\/board\.md/)
    expect(setup).toMatch(/Auto-review/)
    expect(setup).toMatch(/Never allowed/)
    expect(setup).toMatch(/Teach a task/)
    expect(setup).toMatch(/cannot download PDF bytes/)
    expect(setup).toMatch(/D-011/)
    expect(setup).toMatch(/RESEARCH\.md/)
  })

  it("keeps every instruction body under the 4,000-character product cap", () => {
    for (const file of INSTRUCTION_FILES) {
      const body = read(file)
      expect(
        body.length,
        `${file} is ${body.length} chars (cap ${LIMIT})`
      ).toBeLessThanOrEqual(LIMIT)
    }
  })

  it("every body pins never-git, the memory rule, the frozen roster, and out-of-charter", () => {
    for (const file of INSTRUCTION_FILES) {
      const body = read(file)
      expect(body, `${file} must pin never git push`).toMatch(/never git push/i)
      expect(body, `${file} must carry the memory rule`).toMatch(/memory is not the record/i)
      expect(body, `${file} must sit in Big team`).toMatch(/Big team/)
      expect(body, `${file} must keep Frybox out of charter`).toMatch(/Frybox/)
      expect(body, `${file} must hand over the Agent Computer for secrets`).toMatch(/Agent Computer/)
      expect(body, `${file} must refuse SSH tunnels of the shared VM`).toMatch(/SSH-tunnel/)
      for (const name of ["gogo", "Steve", "Jeff", "Rav"]) {
        expect(body, `${file} must name ${name} (frozen four-bot roster)`).toContain(name)
      }
    }
  })

  it("gogo runs the board: listener events, one SHOULD, Cursor cloud agent dispatch", () => {
    const gogo = read("gogo-tpm.instructions.md")
    expect(gogo).toMatch(/pr-opened, pr-merged, ci-failed/)
    expect(gogo).toMatch(/One in-flight SHOULD/i)
    expect(gogo).toMatch(/Cursor cloud agent/)
    expect(gogo).toMatch(/Goal \/ Files \/ Done when \/ Verify/)
    expect(gogo).toMatch(/never merge/i)
    expect(gogo).toMatch(/constants\.ts/)
    expect(gogo).toMatch(/Backlog:/)
    expect(gogo).toMatch(/Never spawn bots, groups, or routines/i)
    expect(gogo).toMatch(/2026-08-31/)
    expect(gogo).toMatch(/Netlify/)
    expect(gogo).toMatch(/stuck twice/i)
    expect(gogo).toMatch(/\/workspace\/board\.md/)
    expect(gogo).toMatch(/Never start a Cursor cloud agent yourself/i)
  })

  it("Steve reports platform state to gogo only and knows bls is on Netlify", () => {
    const steve = read("steve-deploy-ci.instructions.md")
    expect(steve).toMatch(/NETLIFY/i)
    expect(steve).toMatch(/Vercel/)
    expect(steve).toMatch(/drain-integrator\.yml/)
    expect(steve).toMatch(/e2e-suite\.yml/)
    expect(steve).toMatch(/fleet-liveness\.yml/)
    expect(steve).toMatch(/not live on main/i)
    expect(steve).toMatch(/No crons/i)
    expect(steve).toMatch(/to gogo only/i)
    expect(steve).toMatch(/Goal \/ Files \/ Done when/)
    expect(steve).toMatch(/api\/version/)
    expect(steve).toMatch(/SMTP 535/)
    expect(steve).toMatch(/\/workspace\/platform\/last\.md/)
  })

  it("Jeff never mixes the two companies and owns the 8:30pm PT loadboard", () => {
    const jeff = read("jeff-revops.instructions.md")
    expect(jeff).toMatch(/thindcarrier/)
    expect(jeff).toMatch(/atstransport24/)
    expect(jeff).toMatch(/NEVER MIXED/i)
    expect(jeff).toMatch(/8:30pm PT/)
    expect(jeff).toMatch(/Excel for the web/)
    expect(jeff).toMatch(/No copies/i)
    expect(jeff).toMatch(/no whole-file Replace/i)
    expect(jeff).toMatch(/needsAuth/)
    expect(jeff).toMatch(/Highlight/)
    expect(jeff).toMatch(/never invent a rate/i)
    expect(jeff).toMatch(/cannot download PDF bytes/)
    expect(jeff).toMatch(/BROWSER/)
    expect(jeff).toMatch(/\/workspace\/loadboard\/last-run\.md/)
    expect(jeff).toMatch(/Idempotent/)
  })

  it("Rav is proof-only: no outreach, no scraping, claims map to open links", () => {
    const rav = read("rav-career-coach.instructions.md")
    expect(rav).toMatch(/proof/i)
    expect(rav).toMatch(/No LinkedIn connector/i)
    expect(rav).toMatch(/do not scrape/i)
    expect(rav).toMatch(/FACTS\.md/)
    expect(rav).toMatch(/thindtransport\.com\/hub/)
    expect(rav).toMatch(/bluelandscapingservices\.com/)
    expect(rav).toMatch(/MyCO/)
    expect(rav).toMatch(/Salesforce/)
    expect(rav).toMatch(/Goldstein/)
    expect(rav).toMatch(/LoadOff-as-AI/)
    expect(rav).toMatch(/Never post, apply, email/i)
    expect(rav).toMatch(/Talent Scout/)
    expect(rav).toMatch(/\/workspace\/career\//)
  })

  it("the agent preambles brief future sessions on the live Grok team", () => {
    const docs = path.join(process.cwd(), "docs")
    const cursorPreamble = readFileSync(path.join(docs, "cursor-agent-preamble.md"), "utf-8")
    expect(cursorPreamble).toMatch(/gogo/)
    expect(cursorPreamble).toMatch(/never writes git/i)
    expect(cursorPreamble).toMatch(/dispatch board|coding board/i)
    const claudePreamble = readFileSync(path.join(docs, "claude-routine-preamble.md"), "utf-8")
    expect(claudePreamble).toMatch(/gogo/)
    expect(claudePreamble).toMatch(/never pushes/i)
    for (const preamble of [cursorPreamble, claudePreamble]) {
      expect(preamble).not.toMatch(/Engineering Communications Lead/)
      expect(preamble).not.toMatch(/Venture Analyst/)
    }
  })

  it("the README names the platform split, the four bots, and the never-git rule", () => {
    const readme = read("README.md")
    expect(readme).toMatch(/Claude Corps/)
    expect(readme).toMatch(/Cursor cloud agents/)
    expect(readme).toMatch(/Grok Bot/)
    expect(readme).toMatch(/Never/)
    expect(readme).toMatch(/git/)
    expect(readme).toMatch(/D-010/)
    expect(readme).toMatch(/Netlify/)
    expect(readme).toMatch(/Big team/)
    expect(readme).toMatch(/SETUP\.md/)
    expect(readme).toMatch(/RESEARCH\.md/)
    expect(readme).toMatch(/\/workspace\/board\.md/)
    for (const name of ["gogo", "Steve", "Jeff", "Rav"]) {
      expect(readme).toContain(name)
    }
  })
})
