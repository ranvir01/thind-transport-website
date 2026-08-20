/**
 * Every scripts/*.mjs must actually parse.
 *
 * Regression: `scripts/e2e-showcase-smoke.mjs` sat on main unrunnable for
 * multiple cycles. Two `page.evaluate(() => {` callbacks were closed with `)`
 * instead of `})`, so the file was a SyntaxError and the smoke died in 0s at
 * module-compile time — before any check could run, and before the harness
 * could report anything more useful than "exit 1".
 *
 * Nothing in the normal verify chain looks at these files: `npm run build`
 * compiles `src/`, vitest only loads what a test imports, and
 * `typecheck:gate` covers TypeScript. A helper script can therefore be
 * syntactically dead and still pass every gate on the way to main — which is
 * exactly what happened. The break was introduced by the same commit that
 * added the settings subtitle wait right above it (d1d711c), and only a full
 * Chrome rig drive surfaced it.
 *
 * Parsing is the cheapest possible check and catches the whole class, so do
 * it for every script rather than only the e2e ones.
 */
import { describe, expect, it } from "vitest"
import { readdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import path from "node:path"

const SCRIPTS_DIR = path.join(process.cwd(), "scripts")

const scripts = readdirSync(SCRIPTS_DIR)
  .filter((f) => f.endsWith(".mjs"))
  .sort()

describe("scripts/*.mjs parse", () => {
  it("finds the scripts (guard is not silently vacuous)", () => {
    expect(scripts.length).toBeGreaterThan(50)
  })

  it.each(scripts)("%s parses", (file) => {
    // `node --check` is the same parser that runs the script, so it agrees
    // with production behavior in a way a regex or a bundler never would.
    // It throws with the offending line when the file does not parse.
    expect(() =>
      execFileSync(process.execPath, ["--check", path.join(SCRIPTS_DIR, file)], {
        stdio: "pipe",
      })
    ).not.toThrow()
  })
})
