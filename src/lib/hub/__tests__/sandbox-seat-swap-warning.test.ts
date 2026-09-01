/**
 * Taking a sandbox seat calls `signIn` with the sandbox credentials, which
 * REPLACES the visitor's session. That was harmless while /hub/sandbox was
 * URL-only, but the office nav now carries a "Practice mode" link — so an owner
 * mid-shift is one tap from being signed out of their own company with no
 * warning and no way back except the login screen.
 *
 * The page resolves the real carrier and the picker says so. This is a source
 * guard: the page is a server component behind auth, so there is nothing to
 * render in a unit test, but the wiring is exactly what a refactor would drop.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const page = readFileSync(new URL("../../../app/hub/sandbox/page.tsx", import.meta.url), "utf-8")
const picker = readFileSync(new URL("../../../app/hub/sandbox/SeatPicker.tsx", import.meta.url), "utf-8")
const nav = readFileSync(new URL("../navigation.ts", import.meta.url), "utf-8")

describe("sandbox seat swap warning", () => {
  it("is reachable from the nav, which is what makes the warning necessary", () => {
    expect(nav).toContain('href: "/hub/sandbox"')
  })

  it("resolves the visitor's real carrier and passes it to the picker", () => {
    expect(page).toContain("getActiveHubUser")
    expect(page).toContain("signedInAs={realCarrier}")
  })

  it("never treats a sandbox session as a real carrier to warn about", () => {
    // Someone already inside Blue Ridge switching seats loses nothing.
    expect(page).toContain("!isSandboxCarrier(user.carrierId)")
  })

  it("stays public — an anonymous visitor gets the picker, not a login wall", () => {
    expect(page).not.toContain("requireOfficeUser")
    expect(page).not.toContain("redirect(")
  })

  it("tells the visitor the seat swap signs them out, and offers a way back", () => {
    expect(picker).toContain("signs you out of it")
    expect(picker).toContain("Back to {signedInAs}")
    // Their real data is never touched — say so, or the warning reads as a
    // threat to the company's records.
    expect(picker).toContain("Your real data is")
  })
})
