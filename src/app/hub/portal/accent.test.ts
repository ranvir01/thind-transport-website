import { describe, expect, it } from "vitest"
import { PORTAL_ACCENT_DEFAULT, resolvePortalAccent } from "./accent"

const GOLD = "#F2A900"

describe("resolvePortalAccent", () => {
  it("returns the stock chrome for unset accents", () => {
    expect(resolvePortalAccent(null)).toEqual(PORTAL_ACCENT_DEFAULT)
    expect(resolvePortalAccent(undefined)).toEqual(PORTAL_ACCENT_DEFAULT)
    expect(resolvePortalAccent("")).toEqual(PORTAL_ACCENT_DEFAULT)
  })

  it("rejects anything that is not exactly #RRGGBB (the stored format)", () => {
    for (const bad of ["#fff", "F2A900", "#F2A9000", "#GGGGGG", "gold", "rgb(1,2,3)"]) {
      expect(resolvePortalAccent(bad)).toEqual(PORTAL_ACCENT_DEFAULT)
    }
  })

  it("uses a bright accent for both the label and the rule", () => {
    const accent = resolvePortalAccent("#4ADE80") // bright green, readable on navy
    expect(accent.text).toBe("#4ADE80")
    expect(accent.rule).toBe("rgba(74, 222, 128, 0.4)")
  })

  it("keeps the gold label when the accent cannot pass small-text contrast on navy", () => {
    // A navy-on-navy accent would render an invisible label; the rule still tints.
    const accent = resolvePortalAccent("#14213D")
    expect(accent.text).toBe(GOLD)
    expect(accent.rule).toBe("rgba(20, 33, 61, 0.4)")
  })

  it("accepts the brand gold itself, so a carrier can pin the default explicitly", () => {
    expect(resolvePortalAccent(GOLD).text).toBe(GOLD)
    expect(resolvePortalAccent(GOLD).rule).toBe("rgba(242, 169, 0, 0.4)")
  })

  it("never changes the stock hairline unless a valid accent is set", () => {
    expect(PORTAL_ACCENT_DEFAULT.rule).toBe("rgba(255, 255, 255, 0.1)")
  })
})
