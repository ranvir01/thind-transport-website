/**
 * The cookie notice (z-95, full-width, above the mobile command bar) shipped
 * on 6f3389bf and covered the back-to-top control (z-40, bottom-24). Monday
 * nightly 34826853689 then failed check 14: the button was in the DOM
 * (visible=true) but the click landed on the notice, so the page never
 * returned to the top (returned=false). Sunday 34747909467, before the
 * notice, passed the same check.
 *
 * CookieNotice publishes --tt-cookie-notice-h from a ResizeObserver; BackToTop
 * sits above that height. This scan is the ratchet — a layout tweak that
 * drops either side will fail CI the same way the nightly did.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const VAR = "--tt-cookie-notice-h"
const NOTICE = resolve(__dirname, "../components/shared/CookieNotice.tsx")
const BACK = resolve(__dirname, "../components/shared/BackToTop.tsx")

describe("back-to-top sits above the cookie notice", () => {
  it("CookieNotice publishes its rendered height as a CSS variable", () => {
    const src = readFileSync(NOTICE, "utf8")
    expect(src).toContain(VAR)
    expect(src).toMatch(/ResizeObserver/)
    expect(src).toMatch(/setProperty/)
    expect(src).toMatch(/removeProperty/)
  })

  it("BackToTop offsets by that variable and stacks above the notice", () => {
    const src = readFileSync(BACK, "utf8")
    expect(src).toContain(`var(${VAR}`)
    expect(src).toMatch(/z-\[100\]/)
    expect(src).not.toMatch(/\bz-40\b/)
  })
})
