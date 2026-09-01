"use client"

/**
 * Guarantees that a home-screen icon opens the app, whatever URL it was saved
 * with. Mounted once in the root layout, so it covers every page.
 *
 * iOS never updates an existing home-screen icon: every "Add to Home Screen"
 * mints a new one, pinned forever to the URL and manifest that were live the
 * moment it was saved. So an icon created before the install fix — or from a
 * marketing page, or from the homepage, where the manifest is the WEBSITE's
 * (start_url "/") — keeps opening the website no matter what we ship after.
 * That is the owner's "I click it and it goes to the homepage", and no
 * server-side change can reach it. This can: a page opened in standalone
 * display-mode is a launch, not a visit, so it is handed to /hub.
 *
 * It doubles as insurance on the forward path — iOS resolves an install's start
 * URL either from the manifest's `start_url` or from the page it was saved at,
 * both behaviours are alive on phones in a fleet, and this makes the two
 * indistinguishable.
 *
 * Deliberately sitewide despite the cost: an ordinary install of the marketing
 * site (start_url "/") gets pulled into the app too. That is the owner's stated
 * call — "I want the app only, not able to even go to the website once added".
 *
 * Three exemptions, all of them load-bearing:
 *  - /hub itself, or the app would redirect to itself forever.
 *  - /hub/get-app is NOT exempt: it is a page an icon can be pinned to, and a
 *    launch landing on install instructions instead of the app is the bug.
 *  - /driver and /track are separate surfaces. /driver especially: the proxy
 *    sends a legacy driver-portal account from /hub to /driver, so bouncing it
 *    back would be an infinite loop.
 *
 * Standalone display-mode is never reported for a plain browser visit, so for
 * everyone reading the site in Safari or Chrome this component does nothing.
 */

import { useEffect, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import { isAppHost } from "@/lib/app-origin"
import { LOADOFF_BRAND } from "@/lib/hub/brand"

const subscribeNever = () => () => {}

const readStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS <= 12 and some iPadOS builds only expose the legacy flag.
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true

// The server cannot know how the page was launched, and rendering the splash
// into the HTML would hide the page from crawlers. It assumes a browser visit;
// the real answer arrives with the first client render.
const readStandaloneOnServer = () => false

/** The app's landing path — where any stray standalone launch is sent. */
const APP_HOME = "/hub"

/**
 * True when a standalone launch that landed here has landed in the wrong place.
 * Exported for tests: the loop conditions are not something to get wrong twice.
 *
 * `onAppOrigin` is the app's own domain, where the whole origin is the app and
 * there is nothing to rescue anyone from — the rescue only has a job while the
 * app shares an origin with the marketing site.
 */
export function shouldReturnToApp(pathname: string, onAppOrigin = false): boolean {
  if (onAppOrigin) return false
  // Separate surfaces — never redirect out of them.
  if (pathname === "/driver" || pathname.startsWith("/driver/")) return false
  if (pathname === "/track" || pathname.startsWith("/track/")) return false
  // Already in the app. /hub/get-app is the exception: an icon pinned to the
  // install page should open the app, not the instructions for installing it.
  if (pathname === "/hub/get-app") return true
  if (pathname === APP_HOME || pathname.startsWith("/hub/")) return false
  return true
}

export function InstalledAppRedirect() {
  const standalone = useSyncExternalStore(subscribeNever, readStandalone, readStandaloneOnServer)
  const pathname = usePathname()
  // Read on the client rather than passed as a prop: the root layout is a
  // server component shared by both origins, so the host is only knowable here.
  const onAppOrigin = standalone && isAppHost(window.location.host)
  const launching = standalone && shouldReturnToApp(pathname, onAppOrigin)

  useEffect(() => {
    // replace(), not assign(): the website must not sit in the app's back
    // stack, where a swipe would return the container to it.
    if (launching) window.location.replace(APP_HOME)
  }, [launching])

  if (!launching) return null

  // Covers the page for the moment the navigation takes, so the app opens on
  // LoadOff's own colours rather than a flash of the website. Same launch
  // colour as the manifest's background_color, so this cover and the splash
  // screen behind it are one continuous surface.
  return (
    <div
      aria-live="polite"
      style={{ backgroundColor: LOADOFF_BRAND.launch }}
      className="fixed inset-0 z-[100] flex items-center justify-center text-white"
    >
      <p className="text-sm font-medium tracking-wide">Opening LoadOff…</p>
    </div>
  )
}
