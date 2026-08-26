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
  it("ships the README, spawn one-shot, and three instruction bodies", () => {
    const names = new Set(readdirSync(DIR))
    expect(names.has("README.md")).toBe(true)
    expect(names.has("SPAWN.md")).toBe(true)
    for (const file of INSTRUCTION_FILES) {
      expect(names.has(file), `missing ${file}`).toBe(true)
    }
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

  it("the Watcher starts from the daily tools and never writes git", () => {
    const watcher = readFileSync(path.join(DIR, "watcher.instructions.md"), "utf-8")
    expect(watcher).toMatch(/Google/)
    expect(watcher).toMatch(/GitHub/)
    expect(watcher).toMatch(/Dropbox/)
    expect(watcher).toMatch(/LinkedIn/)
    expect(watcher).toMatch(/Vercel/)
    expect(watcher).toMatch(/Never git push/i)
    expect(watcher).toMatch(/Watches sites, dashboards, and feeds/)
  })

  it("the README names the three-platform split and the never-git rule", () => {
    const readme = readFileSync(path.join(DIR, "README.md"), "utf-8")
    expect(readme).toMatch(/Claude Corps/)
    expect(readme).toMatch(/Cursor Automations/)
    expect(readme).toMatch(/Grok Bot/)
    expect(readme).toMatch(/Never/)
    expect(readme).toMatch(/git/)
  })
})
