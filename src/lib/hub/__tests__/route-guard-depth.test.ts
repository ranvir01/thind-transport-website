/**
 * Route handlers don't run layouts, and the proxy's auth gate covers /hub
 * page navigation, not /api/hub — so a route.ts that authenticates with bare
 * getHubUser skips the deactivated-user / suspended-carrier DB re-checks
 * every guard in session.ts performs (its "sessions are JWTs" standing rule).
 * Six /api/hub routes and the three office CSV exports shipped that way, and
 * a suspended tenant kept bulk data egress until its tokens expired.
 *
 * This guard makes the safe pattern the default: any route handler that
 * authenticates must use getActiveHubUser (or a require* guard), never bare
 * getHubUser — new routes fail here, not in the next tenancy audit.
 */
import { describe, expect, it } from "vitest"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

const REPO_ROOT = path.resolve(__dirname, "../../../..")

/**
 * Routes allowed to keep bare getHubUser, each for a stated reason.
 * Add here only with a comment saying why the re-check genuinely can't apply.
 */
const ALLOWED = new Set([
  // Returns only the carrier's validated #rrggbb accent for the PWA manifest,
  // Cache-Control private/no-store — no tenant business data to protect.
  "src/app/api/hub/manifest/route.ts",
  // Sandbox simulator: demoLoginEnabled + isSandboxCarrier gate it to the
  // fixed demo tenant, which has no real users to deactivate.
  "src/app/api/hub/sandbox/tick/route.ts",
])

function routeFilesUnder(dir: string): string[] {
  const out = execFileSync("git", ["ls-files", dir], { cwd: REPO_ROOT, encoding: "utf8" })
  return out
    .split("\n")
    .filter((f) => /(^|\/)route\.ts$/.test(f))
}

describe("route handlers use the active-checking session guard", () => {
  it("no route.ts authenticates with bare getHubUser outside the allowlist", () => {
    const offenders: string[] = []
    for (const file of routeFilesUnder("src/app")) {
      if (ALLOWED.has(file)) continue
      const source = readFileSync(path.join(REPO_ROOT, file), "utf8")
      if (/\bgetHubUser\s*\(/.test(source)) offenders.push(file)
    }
    expect(offenders, `use getActiveHubUser (session.ts) in: ${offenders.join(", ")}`).toEqual([])
  })

  it("the allowlist doesn't rot: every entry still exists and still calls getHubUser", () => {
    for (const file of ALLOWED) {
      const source = readFileSync(path.join(REPO_ROOT, file), "utf8")
      expect(/\bgetHubUser\s*\(/.test(source), `${file} no longer calls getHubUser — remove it from ALLOWED`).toBe(true)
    }
  })
})
