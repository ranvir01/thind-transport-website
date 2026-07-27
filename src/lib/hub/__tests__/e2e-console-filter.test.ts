import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { isBenignResourceUrl, BENIGN_RESOURCE_URL } from "../../../../scripts/e2e-console-filter.mjs"

/**
 * Regression: the e2e smokes' "no console errors" gate false-failed on every
 * local rig because the root layout mounts <Analytics/> + <SpeedInsights/>, so
 * every /hub page requests /_vercel/insights/script.js and
 * /_vercel/speed-insights/script.js — served by Vercel's edge in production but
 * a 404 under `next start`. The browser reports a resource 404 as a URL-less
 * console line, so the gate could only be made accurate by classifying the
 * REQUEST URL. isBenignResourceUrl is that classifier; pin both directions so a
 * future edit can't silently start swallowing real app 404s (or re-break on the
 * Vercel scripts).
 */
describe("isBenignResourceUrl", () => {
  it("treats the Vercel analytics scripts as benign (they 404 only off Vercel)", () => {
    expect(isBenignResourceUrl("http://localhost:3000/_vercel/insights/script.js")).toBe(true)
    expect(isBenignResourceUrl("http://localhost:3000/_vercel/speed-insights/script.js")).toBe(true)
  })

  it("treats favicon and web app manifest as benign", () => {
    expect(isBenignResourceUrl("http://localhost:3000/favicon.ico")).toBe(true)
    expect(isBenignResourceUrl("http://localhost:3000/site.webmanifest")).toBe(true)
  })

  it("flags real app resource 404s as NOT benign, with no false swallow", () => {
    expect(isBenignResourceUrl("http://localhost:3000/hub/money/invoices/abc")).toBe(false)
    expect(isBenignResourceUrl("http://localhost:3000/api/hub/files/pod.pdf")).toBe(false)
    expect(isBenignResourceUrl("http://localhost:3000/_next/static/chunks/main.js")).toBe(false)
    // a real analytics *event* endpoint (not the injected script) is app traffic
    expect(isBenignResourceUrl("http://localhost:3000/_vercel/insights/view")).toBe(false)
  })

  it("is null-safe", () => {
    expect(isBenignResourceUrl(undefined)).toBe(false)
    expect(isBenignResourceUrl("")).toBe(false)
  })

  it("exports the underlying pattern for reuse", () => {
    expect(BENIGN_RESOURCE_URL).toBeInstanceOf(RegExp)
  })
})
