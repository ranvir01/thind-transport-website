import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

/**
 * Grok Bot instruction bodies are capped at 4,000 characters (product limit).
 * Files in docs/grok-bots/ are what the owner pastes, and what a Watcher bot
 * copies when spawning siblings — going over the cap silently truncates the
 * charter. Also pins the "never git push" + daily-connector rule so a rewrite
 * cannot turn Grok Bot into a fourth writer on main.
 */

const DIR = path.join(process.cwd(), "docs/grok-bots")
const LIMIT = 4000
const INSTRUCTION_FILES = [
  "watcher.instructions.md",
  "vercel-github.instructions.md",
  "airtable-coach.instructions.md",
]

describe("grok-bot instruction files (paste-ready, ≤4k)", () => {
  it("ships SETUP.md as the one owner file, plus spawn, groups, and three instruction bodies", () => {
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
    expect(setup).toMatch(/Deploy \/ CI/)
    expect(setup).toMatch(/Airtable coach/)
    expect(setup).toMatch(/LoadOff ops/)
    expect(setup).toMatch(/Back office/)
    expect(setup).toMatch(/Big team/)
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

  it("the Watcher starts from the daily tools, covers the home repo plus other projects, and never writes git", () => {
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
    expect(watcher).toMatch(/Big team/)
    expect(watcher).toMatch(/LoadOff ops/)
    expect(watcher).toMatch(/Back office/)
    expect(watcher).toMatch(/New Group Chat/)
    expect(watcher).toMatch(/@everyone/)
    expect(watcher).toMatch(/HAND TO CLAUDE/)
    expect(watcher).toMatch(/D-007/)
  })

  it("the README names the three-platform split and the never-git rule", () => {
    const readme = readFileSync(path.join(DIR, "README.md"), "utf-8")
    expect(readme).toMatch(/Claude Corps/)
    expect(readme).toMatch(/Cursor Automations/)
    expect(readme).toMatch(/Grok Bot/)
    expect(readme).toMatch(/Never/)
    expect(readme).toMatch(/git/)
    expect(readme).toMatch(/group chat/i)
    expect(readme).toMatch(/Big team/)
    expect(readme).toMatch(/SETUP\.md/)
  })
})
