/**
 * Scope math for the installed app's navigation guard. iOS does not enforce
 * manifest scope, so escapesAppScope() is the only thing deciding whether a
 * click inside the standalone container stays in the app or is handed to the
 * real browser. Wrong in either direction is bad: too loose and the app
 * shows the website (the owner's iPhone repro); too tight and in-app
 * navigation breaks.
 */
import { describe, expect, it } from "vitest"
import { escapesAppScope } from "../standalone-scope"

const ORIGIN = "https://thindtransport.com"

describe("escapesAppScope", () => {
  it("keeps every /hub route in the app", () => {
    for (const href of ["/hub", "/hub/", "/hub/login", "/hub/driver/pay", "/hub/money/invoices/abc"]) {
      expect(escapesAppScope(href, ORIGIN), href).toBe(false)
    }
  })

  it("keeps /api in the app (downloads, auth, manifest)", () => {
    for (const href of ["/api/hub/manifest", "/api/auth/session", "/api/hub/exports/pnl"]) {
      expect(escapesAppScope(href, ORIGIN), href).toBe(false)
    }
  })

  it("ejects marketing routes to the real browser", () => {
    for (const href of ["/", "/loadoff", "/app", "/drivers", "/apply", "/about?x=1", "/pay-rates#top"]) {
      expect(escapesAppScope(href, ORIGIN), href).toBe(true)
    }
  })

  it("does not intercept prefix look-alikes incorrectly", () => {
    // /hubcap is NOT the app; /hub/x is.
    expect(escapesAppScope("/hubcap", ORIGIN)).toBe(true)
    expect(escapesAppScope("/hub/x", ORIGIN)).toBe(false)
  })

  it("leaves cross-origin and special-scheme links alone (OS handles them)", () => {
    for (const href of [
      "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx",
      "tel:+12067656300",
      "mailto:thindcarrier@gmail.com",
      "sms:+12067656300",
    ]) {
      expect(escapesAppScope(href, ORIGIN), href).toBe(false)
    }
  })

  it("resolves relative hrefs against the origin", () => {
    expect(escapesAppScope("https://thindtransport.com/loadoff", ORIGIN)).toBe(true)
    expect(escapesAppScope("https://thindtransport.com/hub/driver", ORIGIN)).toBe(false)
  })

  it("never throws on malformed hrefs", () => {
    expect(escapesAppScope("http://[invalid", ORIGIN)).toBe(false)
  })
})
