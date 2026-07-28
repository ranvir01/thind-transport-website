/**
 * Guards the driver PWA's install identity at the source level.
 *
 * An install page has to get FOUR independent things right, and every one of
 * them fails silently — nothing errors, the icon simply turns out to be the
 * website, and nobody finds out until a driver taps it. Each has been wrong
 * here at least once:
 *
 * - the manifest link, and a manifest whose `scope` actually covers the page
 *   (the root layout hardcoded `<link rel="manifest">` in JSX, which Next does
 *   not dedupe, so /hub served two and browsers honour the first; later, /app
 *   and /loadoff pointed at a manifest scoped to /hub, which iOS discards)
 * - `apple-mobile-web-app-capable`, which Next never emits itself
 * - `apple-mobile-web-app-title`, the name iOS pre-fills in the Add sheet
 * - `apple-touch-icon`, which iOS reads in preference to the manifest icons
 *
 * Plus the belt to those braces: a standalone launch that lands anywhere but
 * the app is handed to /hub, so neither iOS start_url behaviour can strand an
 * icon on the website.
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
    expect(read("src/app/layout.tsx")).toMatch(/icons:\s*SITE_ICONS/)
    // SITE_ICONS is the carrier's mark; APP_ICONS is the product's.
    const sets = read("src/lib/site-icons.ts")
    expect(sets).toMatch(/SITE_ICONS[\s\S]*?apple:\s*\[\{\s*url:\s*["']\/apple-touch-icon\.png["']/)
    expect(sets).toMatch(/APP_ICONS[\s\S]*?apple:\s*\[\{\s*url:\s*["']\/hub-icon-180\.png["']/)
  })

  it("hub layout points at the LoadOff manifest so the installed app opens /hub", () => {
    const hub = read("src/app/hub/layout.tsx")
    expect(hub).toMatch(/manifest:\s*["']\/api\/hub\/manifest["']/)
  })

  it("hub layout carries the LoadOff apple-touch-icon, not the carrier's", () => {
    // iOS prefers apple-touch-icon over the manifest icons, so the app would
    // otherwise wear the Thind Transport mark on the home screen.
    expect(read("src/app/hub/layout.tsx")).toMatch(/icons:\s*\{\s*\.\.\.APP_ICONS/)
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

  it("the marketing install pages carry all four pieces an iOS install needs", () => {
    // Any one of these missing and the icon is wrong in a way nobody sees
    // until it is tapped: no manifest and it is a bookmark; no capable flag
    // and it opens in Safari chrome; no title and the sheet reads "Thind
    // Transport"; no apple icon and the app wears the carrier's mark.
    for (const p of MARKETING_APP_PAGES) {
      const src = code(p)
      expect(src, p).toMatch(/manifest:\s*["']\/api\/hub\/manifest["']/)
      expect(src, p).toMatch(/<meta name="apple-mobile-web-app-capable" content="yes" \/>/)
      expect(src, p).toMatch(/appleWebApp:\s*\{\s*capable:\s*true,\s*title:\s*["']LoadOff["']\s*\}/)
      expect(src, p).toMatch(/icons:\s*APP_ICONS/)
    }
    // …and the manifest they point at must actually reach them on iOS, which
    // is the piece the first attempt at this fix was missing.
    expect(read("src/app/api/hub/manifest/route.ts")).toMatch(/scope:\s*manifestScope\(/)
  })

  it("every install page hands a standalone launch to the app", () => {
    // Covers both iOS behaviours (honour start_url, or pin the page it was
    // installed from) and repairs icons minted before any of this was fixed.
    for (const p of [...MARKETING_APP_PAGES, "src/app/hub/get-app/page.tsx"]) {
      expect(read(p), p).toMatch(/<InstalledAppRedirect \/>/)
    }
    const guard = read("src/components/shared/InstalledAppRedirect.tsx")
    expect(guard).toMatch(/display-mode: standalone/)
    expect(guard).toMatch(/location\.replace\(["']\/hub["']\)/)
  })

  it("marketing pages also funnel to the in-scope install surface", () => {
    // Android's install sheet only fires inside the narrow /hub scope, so
    // /hub/get-app stays the way there. /loadoff links straight to it; /app
    // routes through GetTheApp's platform-aware steps.
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
    // Scope itself is platform-dependent; install-scope.test.ts pins the values.
    expect(route).toMatch(/scope:\s*manifestScope\(/)
    expect(route).toMatch(/display:\s*["']standalone["']/)
    // Installability needs a 192 and a 512, plus a maskable icon so Android
    // doesn't letterbox it inside a white rounded square.
    expect(route).toMatch(/192x192/)
    expect(route).toMatch(/512x512/)
    expect(route).toMatch(/maskable/)
  })
})
