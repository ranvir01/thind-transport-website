/**
 * Where a standalone launch gets sent, and — more importantly — where it must
 * NOT be sent.
 *
 * The redirect is sitewide, so a wrong exemption is not a cosmetic bug: send a
 * page back to /hub that /hub itself redirects away from and the installed app
 * bounces forever with no URL bar to escape from. The /driver case is exactly
 * that shape — src/proxy.ts routes a legacy driver-portal account from /hub to
 * LEGACY_DRIVER_HOME under /driver, so redirecting /driver back to /hub closes
 * the loop.
 */
import { describe, expect, it } from "vitest"
import { shouldReturnToApp } from "@/components/shared/InstalledAppRedirect"

describe("shouldReturnToApp", () => {
  it("rescues a launch that landed on the website", () => {
    // The owner's icon: pinned to "/" by an install that predates the fix, and
    // unreachable by any server-side change since iOS never updates an icon.
    expect(shouldReturnToApp("/")).toBe(true)
    expect(shouldReturnToApp("/loadoff")).toBe(true)
    expect(shouldReturnToApp("/app")).toBe(true)
    expect(shouldReturnToApp("/apply")).toBe(true)
    expect(shouldReturnToApp("/pay-rates")).toBe(true)
  })

  it("leaves a launch that landed in the app alone", () => {
    // Redirecting these to /hub is the infinite loop.
    expect(shouldReturnToApp("/hub")).toBe(false)
    expect(shouldReturnToApp("/hub/login")).toBe(false)
    expect(shouldReturnToApp("/hub/driver")).toBe(false)
    expect(shouldReturnToApp("/hub/dispatch")).toBe(false)
    expect(shouldReturnToApp("/hub/welcome")).toBe(false)
  })

  it("still rescues an icon pinned to the install page", () => {
    // /hub/get-app is in the app's scope but is not the app: an icon that
    // launches onto "here's how to install it" has already been installed.
    expect(shouldReturnToApp("/hub/get-app")).toBe(true)
  })

  it("never touches the driver portal — that pairing is the loop", () => {
    expect(shouldReturnToApp("/driver")).toBe(false)
    expect(shouldReturnToApp("/driver/login")).toBe(false)
    expect(shouldReturnToApp("/driver/dashboard")).toBe(false)
    expect(shouldReturnToApp("/driver/application")).toBe(false)
  })

  it("never touches public load tracking", () => {
    // Brokers open these from an email; they are not the app and have no login.
    expect(shouldReturnToApp("/track")).toBe(false)
    expect(shouldReturnToApp("/track/abc123")).toBe(false)
  })

  it("has no job at all on the app's own origin", () => {
    // There, every page IS the app — the rescue exists only while the app
    // shares an origin with the marketing site, and once the split is on it
    // must not fire on the app's own root.
    for (const p of ["/", "/dispatch", "/hub", "/hub/get-app", "/loadoff"]) {
      expect(shouldReturnToApp(p, true), p).toBe(false)
    }
  })

  it("does not treat a lookalike prefix as in-app", () => {
    // "/hubbub" is a marketing URL, not the app — startsWith("/hub") alone
    // would have wrongly exempted it.
    expect(shouldReturnToApp("/hubbub")).toBe(true)
    expect(shouldReturnToApp("/driverless")).toBe(true)
    expect(shouldReturnToApp("/tracking")).toBe(true)
  })
})
