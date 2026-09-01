"use client"

/**
 * Keeps the INSTALLED app inside the app (mounted once in the hub layout).
 *
 * iOS ignores manifest scope, so any in-app link to a marketing route would
 * navigate the standalone container onto the website — with no URL bar to
 * get back. When (and only when) the app is running standalone, this
 * intercepts clicks on same-origin links that leave /hub and opens them in
 * the real browser instead (window.open from an iOS home-screen app hands
 * off to Safari; on Android it opens a Custom Tab). In a normal browser tab
 * this component does nothing at all.
 *
 * Capture phase, so it wins against Next's <Link> client-side router, whose
 * own handler would otherwise swap the app's content for the website without
 * even a page load.
 */

import { useEffect } from "react"
import { escapesAppScope } from "@/lib/hub/standalone-scope"
import { isAppHost } from "@/lib/app-origin"

export function StandaloneScopeGuard() {
  useEffect(() => {
    if (!window.matchMedia("(display-mode: standalone)").matches) return
    // On the app's own domain the whole origin is the app, so there is nothing
    // to intercept — only the shared-origin case needs a guard at all.
    const onAppOrigin = isAppHost(window.location.host)

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      // Modified clicks (new-tab intent) already leave the container alone.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.("a[href]")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || anchor.getAttribute("target") === "_blank") return
      if (!escapesAppScope(href, window.location.origin, onAppOrigin)) return
      // Retarget rather than preventDefault + window.open: a plain link click
      // with target=_blank rides the user gesture (no popup heuristics), the
      // OS hands it to the real browser, and next/link's own handler bails on
      // any target other than _self — so the SPA router never hijacks it.
      anchor.setAttribute("target", "_blank")
      anchor.setAttribute("rel", "noopener")
    }

    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  return null
}
