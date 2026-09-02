/**
 * The office color mode lives in localStorage, never the OS. The static
 * `prefers-color-scheme` theme-color pair in app/hub/layout.tsx therefore put a
 * #14161f address bar above a WHITE office page on any phone set to dark —
 * half-dark chrome that reads as a broken dark mode, which is what the mobile
 * screenshots showed. Both the first-paint boot script and the live toggle now
 * write one unmediated tag matching the mode actually applied.
 *
 * No jsdom in this suite, so the DOM write is covered by the source guard at
 * the bottom and the colour DECISION — the part with branches — is pure.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { themeColorFor } from "../appearance"

const LIGHT = "#fbfbfd"
const DARK = "#08090d"
const NAVY = "#121316"

describe("themeColorFor", () => {
  it("matches the resolved office mode", () => {
    expect(themeColorFor("light", "/hub")).toBe(LIGHT)
    expect(themeColorFor("dark", "/hub")).toBe(DARK)
    expect(themeColorFor("light", "/hub/loads/abc")).toBe(LIGHT)
  })

  it("keeps driver and portal navy whatever mode is stored", () => {
    for (const path of [
      "/hub/driver",
      "/hub/driver/loads/1",
      "/hub/portal",
      "/hub/portal/loads",
      // The invite landing renders bg-navy without a session; it was the one
      // navy page the regex missed, flashing white on overscroll.
      "/hub/driver-invite/abc",
    ]) {
      expect(themeColorFor("light", path)).toBe(NAVY)
      expect(themeColorFor("dark", path)).toBe(NAVY)
    }
  })

  it("does not mistake an office route that merely contains the word", () => {
    // /hub/drivers is the office roster — light chrome, not the navy app.
    expect(themeColorFor("light", "/hub/drivers")).toBe(LIGHT)
  })
})

describe("first-paint boot script", () => {
  const layout = readFileSync(new URL("../../../app/hub/layout.tsx", import.meta.url), "utf-8")

  it("uses the same three colors, so the bar never flips on hydration", () => {
    for (const color of [LIGHT, DARK, NAVY]) expect(layout).toContain(color)
  })

  it("branches on the same forced-dark paths, boundary included", () => {
    // Not a bare prefix test: /hub/drivers is the office roster and must keep
    // office chrome. The pure half above proves the rule; this proves the boot
    // script uses the same one.
    expect(layout).toContain("(driver|portal|driver-invite)")
    expect(layout).toContain("(\\\\/|$)")
  })

  it("keeps the OS-keyed pair out of the hub viewport", () => {
    expect(layout).not.toMatch(/themeColor:/)
    expect(layout).not.toContain("prefers-color-scheme: dark")
  })

  it("rewrites every tag and keeps watching head, because order cannot be won", () => {
    // The ROOT layout emits its own #121316 and React re-hoists metadata after
    // hydration. The browser honours whichever tag comes first, so deduping to
    // one is a race; making them all agree is not.
    expect(layout).toContain("for(var i=0;i<tags.length;i++)")
    expect(layout).toContain("MutationObserver")
    expect(layout).toContain("{childList:true}")
  })

  it("stamps data-surface so CSS can paint the forced-dark body to match", () => {
    // Clearing the marketing navy off <body> for the office would otherwise
    // leave the driver app flashing WHITE on overscroll — the same bug for the
    // people who use it in a cab.
    expect(layout).toContain("data-surface")
    const css = readFileSync(new URL("../../../app/hub/hub-theme.css", import.meta.url), "utf-8")
    expect(css).toContain('[data-app="hauldesk"] body')
    expect(css).toContain('[data-app="hauldesk"][data-surface="dark"] body')
  })
})

describe("applyAppearance", () => {
  it("syncs the bar on the live toggle, not just on reload", () => {
    const src = readFileSync(new URL("../appearance.ts", import.meta.url), "utf-8")
    expect(src).toMatch(/applyAppearance[\s\S]*syncThemeColor\(mode\)/)
  })
})
