/**
 * Every e2e script must launch Chromium through e2e-lib's launchBrowser().
 *
 * Regression: e2e-notifications-smoke called puppeteer.launch() directly with
 * `args: process.getuid?.() === 0 ? ["--no-sandbox"] : []` and no
 * `headless: "new"`. Agent rigs run as root (got --no-sandbox, passed);
 * GitHub runners run as non-root, so it launched with ZERO args — no
 * --no-sandbox, no --disable-dev-shm-usage — and Chrome died at launch in
 * about a second with a register dump. It was green locally and red in CI
 * for weeks, and no assertion could catch it because the crash happened
 * before any check ran.
 *
 * Twelve scripts had hand-copied flag lists; that duplication is what let one
 * drift into an unrunnable combination. The flags AND the executable-path
 * resolution (which is what makes these runnable in agent sandboxes at all)
 * belong in exactly one place.
 */
import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const SCRIPTS_DIR = path.join(process.cwd(), "scripts")

/** e2e-lib.mjs owns the single real launch call; everything else delegates. */
const LAUNCHER = "e2e-lib.mjs"

/**
 * Strip block comments and whole-line comments before scanning. Without this
 * the guard fires on the very comments that explain the rule (this file's own
 * first draft did exactly that). Trailing comments after code are left in
 * place — stripping those correctly means tracking string literals, and no
 * real launch call hides behind one.
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const t = line.trim()
      return !t.startsWith("//") && !t.startsWith("*")
    })
    .join("\n")
}

const e2eScripts = readdirSync(SCRIPTS_DIR).filter(
  (f) => f.startsWith("e2e-") && f.endsWith(".mjs") && f !== LAUNCHER
)

describe("e2e scripts launch Chromium through one helper", () => {
  it("finds the e2e scripts (guard is not silently vacuous)", () => {
    expect(e2eScripts.length).toBeGreaterThan(40)
  })

  it.each(e2eScripts)("%s never calls puppeteer.launch directly", (file) => {
    const src = codeOnly(readFileSync(path.join(SCRIPTS_DIR, file), "utf-8"))
    expect(
      src.includes("puppeteer.launch("),
      `${file} calls puppeteer.launch() itself. Use launchBrowser() from ` +
        `e2e-lib.mjs — it carries --no-sandbox, --disable-dev-shm-usage, ` +
        `headless:"new", and the executable-path fallback for every rig.`
    ).toBe(false)
  })

  it("launchBrowser carries the flags that keep Chromium alive in CI", () => {
    const lib = readFileSync(path.join(SCRIPTS_DIR, LAUNCHER), "utf-8")
    // --disable-dev-shm-usage is the one that matters on container runners:
    // without it Chrome exhausts the default 64MB /dev/shm and dies at launch.
    expect(lib).toContain("--disable-dev-shm-usage")
    expect(lib).toContain("--no-sandbox")
    expect(lib).toContain('headless: "new"')
  })

  it("no script gates launch flags on the effective user id", () => {
    // The specific shape that caused the regression: flags conditional on
    // running as root. CI is never root; agent rigs usually are.
    for (const file of e2eScripts) {
      const src = codeOnly(readFileSync(path.join(SCRIPTS_DIR, file), "utf-8"))
      expect(/getuid\s*\?*\.?\(\)\s*===\s*0/.test(src), `${file} branches launch behavior on uid`).toBe(false)
    }
  })
})
