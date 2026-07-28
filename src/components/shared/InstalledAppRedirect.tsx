"use client"

/**
 * Guarantees that a home-screen icon opens the app, whichever page it was
 * installed from.
 *
 * The manifest asks for `start_url: "/hub"`, and iOS has honoured that only
 * since it began applying manifests to Add to Home Screen; older behaviour pins
 * the icon to the exact URL it was saved at. Both are alive on phones in a
 * fleet, and the difference is invisible until a driver taps the icon and gets
 * the website with no URL bar to escape from — the owner's report. This closes
 * that gap from the page side: an install page reached in standalone
 * display-mode is a launch, not a visit, so it is handed straight to /hub.
 *
 * It also repairs icons already on phones, including the ones minted while
 * these pages carried `apple-mobile-web-app-capable` without a manifest that
 * covered them.
 *
 * Mounted only on pages an install can start from — never sitewide, where it
 * would hijack an ordinary install of the marketing site (start_url "/").
 * Standalone display-mode is never reported for a plain browser visit, so for
 * everyone reading the page in Safari or Chrome this component does nothing.
 */

import { useEffect, useSyncExternalStore } from "react"

const subscribeNever = () => () => {}

const readStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS <= 12 and some iPadOS builds only expose the legacy flag.
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true

// The server cannot know how the page was launched, and rendering the splash
// into the HTML would hide the page from crawlers. It assumes a browser visit;
// the real answer arrives with the first client render.
const readStandaloneOnServer = () => false

export function InstalledAppRedirect() {
  const launching = useSyncExternalStore(subscribeNever, readStandalone, readStandaloneOnServer)

  useEffect(() => {
    // replace(), not assign(): the marketing page must not sit in the app's
    // back stack, where a swipe would return the container to the website.
    if (launching) window.location.replace("/hub")
  }, [launching])

  if (!launching) return null

  // Covers the page for the moment the navigation takes, so the app opens on
  // LoadOff's own colours rather than a flash of the website.
  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E1621] text-white"
    >
      <p className="text-sm font-medium tracking-wide">Opening LoadOff…</p>
    </div>
  )
}
