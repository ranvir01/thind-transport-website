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
import { appHostRewrite } from "../app-host-routing"
import { appHome, appOriginConfigured, isAppHost } from "../app-origin"

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

describe("appHostRewrite", () => {
  it("serves the app at the origin's root", () => {
    // This is what lets the manifest say scope "/" and start_url "/" honestly.
    expect(appHostRewrite("/")).toBe("/hub")
    expect(appHostRewrite("/dispatch")).toBe("/hub/dispatch")
    expect(appHostRewrite("/money/invoices")).toBe("/hub/money/invoices")
  })

  it("leaves app routes alone, or every internal link doubles the segment", () => {
    // Links and redirects across the codebase all point at /hub/… — rewriting
    // those again would produce /hub/hub/… and 404 the entire app.
    expect(appHostRewrite("/hub")).toBeNull()
    expect(appHostRewrite("/hub/login")).toBeNull()
    expect(appHostRewrite("/hub/get-app")).toBeNull()
  })

  it("leaves API, framework and well-known paths at the root", () => {
    expect(appHostRewrite("/api/hub/manifest")).toBeNull()
    expect(appHostRewrite("/api/auth/session")).toBeNull()
    expect(appHostRewrite("/_next/static/chunk.js")).toBeNull()
    expect(appHostRewrite("/.well-known/webauthn")).toBeNull()
  })

  it("leaves static files alone — the install depends on them resolving", () => {
    // Rewriting /hub-icon-180.png would 404 the icon iOS installs with.
    expect(appHostRewrite("/hub-icon-180.png")).toBeNull()
    expect(appHostRewrite("/favicon.ico")).toBeNull()
    expect(appHostRewrite("/site.webmanifest")).toBeNull()
    expect(appHostRewrite("/robots.txt")).toBeNull()
  })

  it("leaves the separate surfaces alone", () => {
    // The legacy driver portal and public broker tracking are not the app, and
    // mapping them into /hub/* would silently serve a different page.
    expect(appHostRewrite("/driver/login")).toBeNull()
    expect(appHostRewrite("/track/abc123")).toBeNull()
  })
})
