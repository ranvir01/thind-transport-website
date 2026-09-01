/**
 * The manifest's scope decides two unrelated things, and they pull opposite
 * ways — see lib/hub/install-scope.ts. These pin both halves, because getting
 * either wrong is silent: too narrow and Add to Home Screen on iOS installs the
 * website; too wide and Chrome starts opening marketing links inside the app.
 */
import { describe, expect, it } from "vitest"
import { APP_SCOPE, isIosUserAgent, manifestScope } from "../install-scope"

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

describe("isIosUserAgent", () => {
  it("recognises the iPhone and iPad Safari that drivers actually carry", () => {
    expect(isIosUserAgent(IPHONE)).toBe(true)
    expect(isIosUserAgent(IPAD)).toBe(true)
  })

  it("does not mistake Android or desktop for iOS", () => {
    expect(isIosUserAgent(ANDROID)).toBe(false)
    expect(isIosUserAgent(MAC)).toBe(false)
  })

  it("treats a missing User-Agent as not-iOS", () => {
    // The narrow scope is the safe default: it can only under-install, never
    // hand Chrome a claim over the whole marketing site.
    expect(isIosUserAgent(null)).toBe(false)
    expect(isIosUserAgent(undefined)).toBe(false)
    expect(isIosUserAgent("")).toBe(false)
  })
})

describe("manifestScope", () => {
  it("widens to the whole origin on iOS, so an install page outside /hub still installs the app", () => {
    // A manifest is applied only to documents inside its scope. At /hub the
    // manifest was discarded on /app and /loadoff, and the home-screen icon
    // fell back to the page's own title, favicon and URL — the website.
    expect(manifestScope(IPHONE)).toBe("/")
    expect(manifestScope(IPAD)).toBe("/")
  })

  it("keeps the app's own scope everywhere else", () => {
    // Off iOS, scope is enforced: it is what stops Chrome capturing plain
    // thindtransport.com links into the installed app's window.
    expect(manifestScope(ANDROID)).toBe(APP_SCOPE)
    expect(manifestScope(MAC)).toBe(APP_SCOPE)
    expect(manifestScope(null)).toBe(APP_SCOPE)
  })

  it("never scopes the app to something start_url sits outside of", () => {
    // start_url "/hub" must be within scope or the manifest is invalid.
    for (const ua of [IPHONE, IPAD, ANDROID, MAC, null]) {
      expect("/hub".startsWith(manifestScope(ua))).toBe(true)
    }
  })
})
