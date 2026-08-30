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
    for (const path of ["/hub/driver", "/hub/driver/loads/1", "/hub/portal", "/hub/portal/loads"]) {
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
    expect(layout).toContain("(driver|portal)")
    expect(layout).toContain("(\\\\/|$)")
  })

  it("removes Next's media-matched pair rather than adding a third tag", () => {
    // A leftover media tag keeps winning on a dark-set phone, which is the
    // whole bug.
    expect(layout).toContain('meta[name="theme-color"]')
    expect(layout).toContain("removeChild")
  })
})

describe("applyAppearance", () => {
  it("syncs the bar on the live toggle, not just on reload", () => {
    const src = readFileSync(new URL("../appearance.ts", import.meta.url), "utf-8")
    expect(src).toMatch(/applyAppearance[\s\S]*syncThemeColor\(mode\)/)
  })
})
