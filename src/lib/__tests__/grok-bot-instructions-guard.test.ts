import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

/**
 * Grok Bot instruction bodies are capped at 4,000 characters (product limit).
 * Files in docs/grok-bots/ are what the owner pastes, and what the Technical
 * Program Manager copies when spawning siblings — going over the cap silently
 * truncates the charter. Also pins the "never git push" + daily-connector rule
 * so a rewrite cannot turn Grok Bot into a fourth writer on main.
 */

const DIR = path.join(process.cwd(), "docs/grok-bots")
const LIMIT = 4000
const INSTRUCTION_FILES = [
  "watcher.instructions.md",
  "vercel-github.instructions.md",
  "airtable-coach.instructions.md",
  "loadoff-engineer.instructions.md",
  "bls-engineer.instructions.md",
  "eng-comms.instructions.md",
  "project-engineer.instructions.md",
]

describe("grok-bot instruction files (paste-ready, ≤4k)", () => {
  it("ships SETUP.md as the one owner file, plus spawn, groups, and instruction bodies", () => {
    const names = new Set(readdirSync(DIR))
    expect(names.has("SETUP.md")).toBe(true)
    expect(names.has("README.md")).toBe(true)
    expect(names.has("SPAWN.md")).toBe(true)
    expect(names.has("GROUPS.md")).toBe(true)
    for (const file of INSTRUCTION_FILES) {
      expect(names.has(file), `missing ${file}`).toBe(true)
    }
    const setup = readFileSync(path.join(DIR, "SETUP.md"), "utf-8")
    expect(setup).toMatch(/THE FILE/)
    expect(setup).toMatch(/This is that file/)
    expect(setup).toMatch(/Technical Program Manager/)
    expect(setup).toMatch(/Staff Platform Engineer/)
    expect(setup).toMatch(/Revenue Operations Analyst/)
    expect(setup).toMatch(/Staff Product Engineer \(LoadOff\)/)
    expect(setup).toMatch(/Software Engineer \(BLS\)/)
    expect(setup).toMatch(/Engineering Communications Lead/)
    expect(setup).toMatch(/Claude stand-up/)
    expect(setup).toMatch(/HAPPENED/)
    expect(setup).toMatch(/IN FLIGHT/)
    expect(setup).toMatch(/SHOULD/)
    expect(setup).toMatch(/LoadOff engineering/)
    expect(setup).toMatch(/BLS engineering/)
    expect(setup).toMatch(/Back office/)
    expect(setup).toMatch(/New Group Chat/)
    expect(setup).toMatch(/bls-website/)
    expect(setup).toMatch(/app0RJwxcpO3RS3X7/)
    expect(setup).toMatch(/LinkedIn/)
    expect(setup).toMatch(/Frybox/)
    expect(setup).toMatch(/watcher\.instructions\.md/)
    expect(setup).toMatch(/Projects this team handles/)
  })

  it("keeps every instruction body under the 4,000-character product cap", () => {
    for (const file of INSTRUCTION_FILES) {
      const body = readFileSync(path.join(DIR, file), "utf-8")
      expect(
        body.length,
        `${file} is ${body.length} chars (cap ${LIMIT})`
      ).toBeLessThanOrEqual(LIMIT)
    }
  })

  it("the TPM starts from the daily tools, spawns project specialists, and never writes git", () => {
    const watcher = readFileSync(path.join(DIR, "watcher.instructions.md"), "utf-8")
    expect(watcher).toMatch(/Google/)
    expect(watcher).toMatch(/GitHub/)
    expect(watcher).toMatch(/Dropbox/)
    expect(watcher).toMatch(/LinkedIn/)
    expect(watcher).toMatch(/Vercel/)
    expect(watcher).toMatch(/Never git push/i)
    expect(watcher).toMatch(/Watches sites, dashboards, and feeds/)
    expect(watcher).toMatch(/thind-transport-website/)
    expect(watcher).toMatch(/ranvir01/)
    expect(watcher).toMatch(/bls-website/)
    expect(watcher).toMatch(/portfolio/)
    expect(watcher).toMatch(/group chat/i)
    expect(watcher).toMatch(/2–6|2-6/)
    expect(watcher).toMatch(/Technical Program Manager/)
    expect(watcher).toMatch(/Staff Platform Engineer/)
    expect(watcher).toMatch(/Revenue Operations Analyst/)
    expect(watcher).toMatch(/Staff Product Engineer \(LoadOff\)/)
    expect(watcher).toMatch(/Software Engineer \(BLS\)/)
    expect(watcher).toMatch(/Engineering Communications Lead/)
    expect(watcher).toMatch(/SPAWN/)
    expect(watcher).toMatch(/project-engineer\.instructions\.md/)
    expect(watcher).toMatch(/Claude stand-up/)
    expect(watcher).toMatch(/LoadOff engineering/)
    expect(watcher).toMatch(/BLS engineering/)
    expect(watcher).toMatch(/Back office/)
    expect(watcher).toMatch(/New Group Chat/)
    expect(watcher).toMatch(/@everyone/)
    expect(watcher).toMatch(/HAND TO CLAUDE/)
    expect(watcher).toMatch(/D-007/)
    expect(watcher).toMatch(/D-008/)
  })

  it("Engineering Communications Lead publishes HAPPENED / IN FLIGHT / SHOULD for Claude", () => {
    const comms = readFileSync(path.join(DIR, "eng-comms.instructions.md"), "utf-8")
    expect(comms).toMatch(/Engineering Communications Lead/)
    expect(comms).toMatch(/HAPPENED/)
    expect(comms).toMatch(/IN FLIGHT/)
    expect(comms).toMatch(/SHOULD/)
    expect(comms).toMatch(/Claude/)
    expect(comms).toMatch(/Never git push/i)
    expect(comms).toMatch(/Goal:/)
    expect(comms).toMatch(/Files:/)
    expect(comms).toMatch(/Done when:/)
    expect(comms).toMatch(/thind-transport-website/)
    expect(comms).toMatch(/bls-website/)
  })

  it("the README names the three-platform split, job titles, and the never-git rule", () => {
    const readme = readFileSync(path.join(DIR, "README.md"), "utf-8")
    expect(readme).toMatch(/Claude Corps/)
    expect(readme).toMatch(/Cursor Automations/)
    expect(readme).toMatch(/Grok Bot/)
    expect(readme).toMatch(/Never/)
    expect(readme).toMatch(/git/)
    expect(readme).toMatch(/group chat/i)
    expect(readme).toMatch(/Technical Program Manager/)
    expect(readme).toMatch(/Engineering Communications Lead/)
    expect(readme).toMatch(/Claude stand-up/)
    expect(readme).toMatch(/SETUP\.md/)
    expect(readme).toMatch(/D-008/)
  })
})
