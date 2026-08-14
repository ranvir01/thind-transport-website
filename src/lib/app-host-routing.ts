/**
 * How the app's own origin reaches the app.
 *
 * The app's routes live under /hub in the Next router. An earlier version of
 * this hid that segment by rewriting every path on the app origin — "/" served
 * /hub, "/dispatch" served /hub/dispatch — so URLs looked clean. That was the
 * wrong trade. `usePathname()` reports the BROWSER path, not the rewritten one,
 * and a large amount of this app decides what to render by comparing it to
 * "/hub": the theme boot script, the marketing chrome's hide rules, and the
 * hub's own active-nav highlighting. Under the rewrite they all saw "/login"
 * and concluded they were on the marketing site — the app rendered wrapped in
 * the Thind Transport navbar and command bar, unthemed. Three bugs found, more
 * certain to follow.
 *
 * So the segment stays visible and only the root is moved. The app origin
 * redirects "/" to "/hub"; every other path is already correct as written.
 * Cosmetically the URL keeps /hub, which buys nothing and costs nothing — the
 * point of the split is the manifest, the install identity, and keeping the
 * carrier's marketing off the product's domain, none of which need clean paths.
 */

/**
 * True when `pathname` is the segment itself or inside it.
 *
 * NOT `startsWith(segment)`: that also matches "/hubbub" and — the way this bit
 * — "/hub-sw.js". Widening the middleware matcher to every route put the
 * service worker script behind the /hub auth gate, so it 307'd to the login
 * page and every registration failed with "the script resource is behind a
 * redirect", silently killing the offline shell and push on both origins.
 */
export function inSegment(pathname: string, segment: string): boolean {
  return pathname === segment || pathname.startsWith(`${segment}/`)
}

/**
 * Where a request on the app's own origin should be sent, or null to serve it
 * as-is. Only the bare root moves; callers invoke this only when the host is
 * the app host.
 */
export function appHostLanding(pathname: string): string | null {
  return pathname === "/" ? "/hub" : null
}
