import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Contract test for the service worker source. hub-sw.js is a plain script
 * (no imports, runs in the SW global), so we assert on its text: the offline
 * shell must cover the whole hub — office/team screens included — not just
 * the driver app, and must never cache a signed-out login shell or an error
 * page as the offline fallback.
 */
const sw = readFileSync(join(process.cwd(), "public", "hub-sw.js"), "utf8")

describe("hub service worker offline shell", () => {
  it("handles navigations for the whole hub, not only /hub/driver", () => {
    const navigateBranch = sw.slice(sw.indexOf('mode === "navigate"'))
    expect(navigateBranch).toContain('url.pathname.startsWith("/hub")')
    // The driver prefix may appear only to pick the section fallback page,
    // never as the gate on which navigations get offline handling. The gate
    // is the if-condition: everything up to its opening brace.
    const gateStart = sw.indexOf('mode === "navigate"')
    const gate = sw.slice(gateStart, sw.indexOf("{", gateStart))
    expect(gate).not.toContain('startsWith("/hub/driver")')
  })

  it("never caches the login page", () => {
    expect(sw).toContain('!url.pathname.startsWith("/hub/login")')
  })

  it("only caches successful navigation responses", () => {
    const navigateBranch = sw.slice(sw.indexOf('mode === "navigate"'))
    expect(navigateBranch).toContain("response.ok")
  })

  it("falls back to the section home for the user's side of the app", () => {
    expect(sw).toContain('url.pathname.startsWith("/hub/driver") ? "/hub/driver" : "/hub"')
  })

  it("bumped the shell cache past v1 so stale driver-only caches are purged", () => {
    expect(sw).not.toContain('"hauldesk-shell-v1"')
    expect(sw).toMatch(/const SHELL_CACHE = "hauldesk-shell-v\d+"/)
  })
})
