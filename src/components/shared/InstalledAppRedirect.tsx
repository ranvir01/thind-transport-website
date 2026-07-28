"use client"

/**
 * Repairs home-screen icons that were minted against a marketing page.
 *
 * /app and /loadoff used to ship `apple-mobile-web-app-capable` together with
 * the LoadOff manifest. iOS discards a manifest whose `scope` (here /hub) does
 * not cover the current document, so all that survived was the capable flag —
 * which tells iOS to install a chrome-less standalone window pinned to the
 * MARKETING page. Tapping the icon opened the website with no URL bar and no
 * way through to the app: the owner's report.
 *
 * The metadata is fixed, but icons already on a phone keep launching at the URL
 * they were saved with. Those launches land here in standalone display-mode —
 * a state a plain Safari visit never reports — so we hand them straight to the
 * app. Ordinary browser visits (the overwhelming majority) do nothing at all.
 *
 * Deliberately narrow: it is mounted only on the two pages that could mint such
 * an icon, so installing the marketing site proper (start_url "/") is untouched.
 */

import { useEffect } from "react"

export function InstalledAppRedirect() {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS <= 12 and some iPadOS builds only expose the legacy flag.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!standalone) return
    // replace(), not assign(): the marketing page must not sit in the app's
    // back stack, where a swipe would return the container to the website.
    window.location.replace("/hub")
  }, [])

  return null
}
