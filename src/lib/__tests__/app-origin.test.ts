/**
 * The seam that separates the two products.
 *
 * Everything downstream keys off these two functions: whether middleware
 * rewrites the origin's root into the app, what `scope` and `start_url` the
 * manifest claims, and whether the standalone rescue has a job. A wrong answer
 * here either leaves the split switched off silently or applies it to the
 * carrier's website.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { appHostLanding, inSegment } from "../app-host-routing"
import { appHome, appOriginConfigured, isAppHost } from "../app-origin"
import { escapesAppScope } from "../hub/standalone-scope"

afterEach(() => vi.unstubAllEnvs())

const withAppHost = (host: string) => vi.stubEnv("NEXT_PUBLIC_APP_HOST", host)

describe("isAppHost", () => {
  it("is off entirely until a host is configured", () => {
    // The default. Shipping this before a domain exists must change nothing.
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "")
    expect(appOriginConfigured()).toBe(false)
    expect(isAppHost("app.loadoff.com")).toBe(false)
    expect(isAppHost("thindtransport.com")).toBe(false)
    expect(appHome("app.loadoff.com")).toBe("/hub")
  })

  it("matches the configured host and nothing else", () => {
    withAppHost("app.loadoff.com")
    expect(appOriginConfigured()).toBe(true)
    expect(isAppHost("app.loadoff.com")).toBe(true)
    // The carrier's website must never be mistaken for the app.
    expect(isAppHost("thindtransport.com")).toBe(false)
    expect(isAppHost("www.thindtransport.com")).toBe(false)
    // A suffix match would hand the app origin to an attacker-controlled host.
    expect(isAppHost("evil-app.loadoff.com.attacker.test")).toBe(false)
    expect(isAppHost("notapp.loadoff.com")).toBe(false)
  })

  it("ignores port and case, because the Host header is not normalised", () => {
    withAppHost("app.loadoff.com")
    expect(isAppHost("APP.LoadOff.com")).toBe(true)
    expect(isAppHost("app.loadoff.com:3000")).toBe(true)
    expect(isAppHost(null)).toBe(false)
    expect(isAppHost(undefined)).toBe(false)
  })

  it("puts the app at the origin root once configured", () => {
    withAppHost("app.loadoff.com")
    expect(appHome("app.loadoff.com")).toBe("/")
    expect(appHome("thindtransport.com")).toBe("/hub")
  })
})

describe("appHostLanding", () => {
  it("sends the app origin's root into the app", () => {
    expect(appHostLanding("/")).toBe("/hub")
  })

  it("keeps the carrier's marketing off the product's domain", () => {
    // Without this the app origin serves /apply, /pay-rates and the rest
    // verbatim: a competitor-adjacent carrier's recruiting site on the
    // product's domain, and two hosts serving identical pages.
    for (const p of ["/apply", "/loadoff", "/app", "/pay-rates", "/hubbub"]) {
      expect(appHostLanding(p), p).toBe("/hub")
    }
  })

  it("serves the app itself unchanged", () => {
    // A redirect here would loop; and note these stay /hub/* rather than being
    // rewritten to clean paths, because usePathname() reports the browser path
    // and the theme boot, chrome hide-rules and active-nav all compare it.
    for (const p of ["/hub", "/hub/login", "/hub/get-app", "/hub/dispatch"]) {
      expect(appHostLanding(p), p).toBeNull()
    }
  })

  it("never redirects the assets an install depends on", () => {
    // Redirecting /hub-sw.js is exactly how service worker registration died
    // once already ("the script resource is behind a redirect").
    for (const p of ["/hub-sw.js", "/hub-icon-180.png", "/site.webmanifest", "/robots.txt", "/favicon.ico"]) {
      expect(appHostLanding(p), p).toBeNull()
    }
    expect(appHostLanding("/api/hub/manifest")).toBeNull()
    expect(appHostLanding("/_next/static/chunk.js")).toBeNull()
    expect(appHostLanding("/.well-known/webauthn")).toBeNull()
  })

  it("leaves the separate surfaces alone", () => {
    // /driver especially: the proxy sends a legacy driver account from /hub to
    // /driver, so redirecting it back to /hub closes an infinite loop.
    expect(appHostLanding("/driver/login")).toBeNull()
    expect(appHostLanding("/track/abc123")).toBeNull()
  })
})

describe("inSegment", () => {
  it("respects the path boundary", () => {
    // startsWith("/hub") also matches "/hub-sw.js": widening the middleware
    // matcher put the service worker script behind the auth gate, it 307'd,
    // and every registration failed with "the script resource is behind a
    // redirect" — killing the offline shell on both origins, silently.
    expect(inSegment("/hub", "/hub")).toBe(true)
    expect(inSegment("/hub/login", "/hub")).toBe(true)
    expect(inSegment("/hub-sw.js", "/hub")).toBe(false)
    expect(inSegment("/hubbub", "/hub")).toBe(false)
  })
})

describe("escapesAppScope on the app's own origin", () => {
  const origin = "https://app.loadoff.com"

  it("treats nothing same-origin as an escape", () => {
    // Including "/" — which is the app's own home page there. Handing that to
    // the browser would eject the driver on every logo tap.
    for (const href of ["/", "/dispatch", "/hub/login", "/settings"]) {
      expect(escapesAppScope(href, origin, true), href).toBe(false)
    }
  })

  it("still keeps the shared-origin behaviour when not on the app origin", () => {
    expect(escapesAppScope("/", origin, false)).toBe(true)
    expect(escapesAppScope("/hub/dispatch", origin, false)).toBe(false)
  })
})
