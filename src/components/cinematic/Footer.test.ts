import { describe, expect, it } from "vitest"
import { shouldHideMobileCommandBar } from "./Footer"

describe("shouldHideMobileCommandBar", () => {
  it("hides on the apply page", () => {
    expect(shouldHideMobileCommandBar("/apply")).toBe(true)
  })

  it("hides anywhere in the hub (own bottom navigation)", () => {
    expect(shouldHideMobileCommandBar("/hub")).toBe(true)
    expect(shouldHideMobileCommandBar("/hub/loadboard")).toBe(true)
  })

  it("hides on tracking pages", () => {
    expect(shouldHideMobileCommandBar("/track")).toBe(true)
    expect(shouldHideMobileCommandBar("/track/abc123")).toBe(true)
  })

  it("hides on the legacy driver portal (own submit buttons)", () => {
    expect(shouldHideMobileCommandBar("/driver")).toBe(true)
    expect(shouldHideMobileCommandBar("/driver/register")).toBe(true)
    expect(shouldHideMobileCommandBar("/driver/login")).toBe(true)
  })

  it("shows on marketing routes", () => {
    expect(shouldHideMobileCommandBar("/")).toBe(false)
    expect(shouldHideMobileCommandBar("/pay-rates")).toBe(false)
    expect(shouldHideMobileCommandBar("/benefits")).toBe(false)
  })

  it("does not treat unrelated routes with matching prefixes as excluded", () => {
    expect(shouldHideMobileCommandBar("/apply-now")).toBe(false)
  })
})
