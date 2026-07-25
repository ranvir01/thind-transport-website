/**
 * Guards the driver PWA's install identity at the source level.
 *
 * The bug this exists to prevent: the root layout hardcoded
 * `<link rel="manifest" href="/site.webmanifest">` in its JSX. Next only
 * dedupes tags it generates from `metadata`, so on /hub routes the head ended
 * up with TWO manifest links — the marketing one first, the LoadOff one second.
 * Browsers honour the first, so a driver tapping "Add to Home Screen" installed
 * the marketing website (start_url "/") instead of the driver app
 * (start_url "/hub"). Nothing failed loudly; the icon just opened the wrong app.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf-8")

describe("PWA manifest wiring", () => {
  it("root layout declares the manifest via metadata, never as a hardcoded <link>", () => {
    const root = read("src/app/layout.tsx")
    // A literal manifest link tag in JSX is what caused the duplicate.
    expect(root).not.toMatch(/<link[^>]+rel=["']manifest["']/)
    expect(root).toMatch(/manifest:\s*["']\/site\.webmanifest["']/)
  })

  it("hub layout points at the LoadOff manifest so the installed app opens /hub", () => {
    const hub = read("src/app/hub/layout.tsx")
    expect(hub).toMatch(/manifest:\s*["']\/api\/hub\/manifest["']/)
  })

  it("hub layout ships the apple-prefixed standalone flag for iPhone drivers", () => {
    const hub = read("src/app/hub/layout.tsx")
    // Next emits only `mobile-web-app-capable`; iOS keys standalone launch off
    // the apple-prefixed name, so it must be present explicitly.
    expect(hub).toMatch(/apple-mobile-web-app-capable/)
    expect(hub).toMatch(/capable:\s*true/)
  })

  it("the install-intent marketing pages (/app, /loadoff) carry the LoadOff manifest", () => {
    // iOS binds Add-to-Home-Screen to the CURRENT page's manifest. On these
    // two pages the gesture means "install the app" — with the marketing
    // manifest they minted icons that opened the website (owner's iPhone
    // repro, 2026-07-25). The override in each page's metadata is the fix.
    for (const p of ["src/app/app/page.tsx", "src/app/loadoff/page.tsx"]) {
      const src = read(p)
      expect(src, p).toMatch(/manifest:\s*["']\/api\/hub\/manifest["']/)
      expect(src, p).toMatch(/apple-mobile-web-app-capable/)
    }
  })

  it("/hub/get-app is proxy-exempt so a logged-out phone can reach the install surface", () => {
    const proxy = read("src/proxy.ts")
    expect(proxy).toMatch(/pathname === ["']\/hub\/get-app["']/)
  })

  it("the standalone scope guard is mounted in the hub layout", () => {
    // iOS ignores manifest scope: without the guard, one marketing link
    // inside the installed app swaps the app container for the website.
    const hub = read("src/app/hub/layout.tsx")
    expect(hub).toMatch(/<StandaloneScopeGuard \/>/)
  })

  it("the LoadOff manifest scopes and starts inside /hub, with installable icons", () => {
    // Asserted against the route source rather than by importing it: the route
    // pulls next-auth, which needs a Next server runtime vitest doesn't provide.
    // (Rendered manifest values are covered by manifest-branding.test.ts.)
    const route = read("src/app/api/hub/manifest/route.ts")
    expect(route).toMatch(/start_url:\s*["']\/hub["']/)
    expect(route).toMatch(/scope:\s*["']\/hub["']/)
    expect(route).toMatch(/display:\s*["']standalone["']/)
    // Installability needs a 192 and a 512, plus a maskable icon so Android
    // doesn't letterbox it inside a white rounded square.
    expect(route).toMatch(/192x192/)
    expect(route).toMatch(/512x512/)
    expect(route).toMatch(/maskable/)
  })
})
