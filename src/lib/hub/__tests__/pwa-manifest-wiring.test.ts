/**
 * Guards the driver PWA's install identity at the source level.
 *
 * Two bugs live behind these assertions, both of which handed a driver a
 * home-screen icon that opened the WEBSITE instead of the app:
 *
 * 1. The root layout hardcoded `<link rel="manifest" href="/site.webmanifest">`
 *    in its JSX. Next only dedupes tags it generates from `metadata`, so /hub
 *    routes ended up with two manifest links — marketing first — and browsers
 *    honour the first one.
 * 2. The marketing pages /app and /loadoff then declared the LoadOff manifest
 *    plus `apple-mobile-web-app-capable`. A manifest only applies to documents
 *    inside its `scope`, and LoadOff's scope is /hub, so iOS discarded the
 *    manifest and kept the capable flag — installing a chrome-less window
 *    pinned to the marketing page, with no URL bar to escape from.
 *
 * The same class of mistake applies to icons: iOS reads the home-screen icon
 * from `<link rel="apple-touch-icon">` before it looks at the manifest, so a
 * hardcoded marketing one in the root layout branded the app as the carrier.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf-8")

/**
 * Source with comments removed. The "must NOT contain" assertions below look
 * for literal tags, and these files explain in prose exactly which tags must
 * not appear — quoting a `<link rel="apple-touch-icon">` in a comment is not
 * the same as shipping one.
 */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")

const MARKETING_APP_PAGES = ["src/app/app/page.tsx", "src/app/loadoff/page.tsx"]

describe("PWA manifest wiring", () => {
  it("root layout declares the manifest via metadata, never as a hardcoded <link>", () => {
    // A literal manifest link tag in JSX is what caused the duplicate.
    expect(code("src/app/layout.tsx")).not.toMatch(/<link[^>]+rel=["']manifest["']/)
    expect(read("src/app/layout.tsx")).toMatch(/manifest:\s*["']\/site\.webmanifest["']/)
  })

  it("root layout declares icons via metadata so /hub can override them", () => {
    expect(code("src/app/layout.tsx")).not.toMatch(/<link[^>]+rel=["']apple-touch-icon["']/)
    expect(code("src/app/layout.tsx")).not.toMatch(/<link[^>]+rel=["']icon["']/)
    const root = read("src/app/layout.tsx")
    expect(root).toMatch(/icons:\s*\{/)
    expect(root).toMatch(/apple:\s*\[\{\s*url:\s*["']\/apple-touch-icon\.png["']/)
  })

  it("hub layout points at the LoadOff manifest so the installed app opens /hub", () => {
    const hub = read("src/app/hub/layout.tsx")
    expect(hub).toMatch(/manifest:\s*["']\/api\/hub\/manifest["']/)
  })

  it("hub layout carries the LoadOff apple-touch-icon, not the carrier's", () => {
    // iOS prefers apple-touch-icon over the manifest icons, so the app would
    // otherwise wear the Thind Transport mark on the home screen.
    const hub = read("src/app/hub/layout.tsx")
    expect(hub).toMatch(/apple:\s*\[\{\s*url:\s*["']\/hub-icon-180\.png["']/)
  })

  it("hub pages title absolutely, so the app never renders the carrier's name", () => {
    // A nested layout's `title.default` still runs through the ROOT template:
    // as `default`, /hub/login rendered "LoadOff | Thind Transport", and iOS
    // falls back to <title> when it names a home-screen icon.
    const hub = read("src/app/hub/layout.tsx")
    expect(hub).toMatch(/title:\s*\{\s*absolute:\s*PRODUCT\.name/)
  })

  it("hub layout ships the apple-prefixed standalone flag for iPhone drivers", () => {
    const hub = read("src/app/hub/layout.tsx")
    // Next emits only `mobile-web-app-capable`; iOS keys standalone launch off
    // the apple-prefixed name, so it must be present explicitly.
    expect(hub).toMatch(/apple-mobile-web-app-capable/)
    expect(hub).toMatch(/capable:\s*true/)
  })

  it("marketing pages never claim the app's manifest or the standalone flag", () => {
    // Out of the manifest's /hub scope, so the manifest is discarded and only
    // the capable flag survives — which pins a chrome-less window to a
    // marketing page (the owner's "it opens the website" iPhone repro).
    for (const p of MARKETING_APP_PAGES) {
      const src = code(p)
      expect(src, p).not.toMatch(/manifest:\s*["']\/api\/hub\/manifest["']/)
      expect(src, p).not.toMatch(/<meta name="apple-mobile-web-app-capable"/)
      expect(src, p).not.toMatch(/appleWebApp:/)
    }
  })

  it("marketing pages send an already-installed icon back into the app", () => {
    // Icons minted before the fix still launch at /app or /loadoff. Landing
    // there in standalone display-mode means exactly that, so those launches
    // are handed to /hub rather than left stranded on the website.
    for (const p of MARKETING_APP_PAGES) {
      expect(read(p), p).toMatch(/<InstalledAppRedirect \/>/)
    }
    const guard = read("src/components/shared/InstalledAppRedirect.tsx")
    expect(guard).toMatch(/display-mode: standalone/)
    expect(guard).toMatch(/location\.replace\(["']\/hub["']\)/)
  })

  it("marketing pages funnel to the in-scope install surface", () => {
    // The only gesture that can install the app is Add to Home Screen from a
    // page inside /hub, so both pages must offer the way there. /loadoff links
    // straight to it; /app routes through GetTheApp's platform-aware steps.
    expect(read("src/app/loadoff/page.tsx")).toMatch(/href="\/hub\/get-app"/)
    expect(read("src/app/app/page.tsx")).toMatch(/<GetTheApp \/>/)
    expect(read("src/components/features/GetTheApp.tsx")).toMatch(/href="\/hub\/get-app"/)
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
    expect(route).toMatch(/id:\s*["']\/hub["']/)
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
