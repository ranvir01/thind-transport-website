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

/** Paths the app origin serves unchanged, and why each one has to be exempt. */
function servedAsIs(pathname: string): boolean {
  // The app itself.
  if (inSegment(pathname, "/hub")) return true
  // The app's own fetches, auth callbacks, file downloads and the manifest.
  if (inSegment(pathname, "/api")) return true
  // Framework and metadata routes that must resolve at the root of any origin.
  if (pathname.startsWith("/_next/")) return true
  if (pathname.startsWith("/.well-known/")) return true
  // Separate surfaces, same exemptions the standalone rescue makes: the legacy
  // driver portal, and public load tracking a broker opens from an email.
  if (inSegment(pathname, "/driver")) return true
  if (inSegment(pathname, "/track")) return true
  // Static files — the service worker script, the icons an install resolves,
  // robots.txt. Redirecting these is how the offline shell died once already.
  if (/\.[a-z0-9]+$/i.test(pathname)) return true
  return false
}

/**
 * Where a request on the app's own origin should be sent, or null to serve it
 * as-is. Callers invoke this only when the host is the app host.
 *
 * Everything that is not the app goes to the app. That covers the bare root,
 * and it covers the carrier's marketing pages: without this, app.loadoff.com
 * would serve /apply, /pay-rates and the rest verbatim — the product's domain
 * hosting a competitor-adjacent carrier's recruiting site, and two hosts
 * serving identical pages for Google to pick between. A redirect rather than a
 * rewrite, so `usePathname()` reports /hub and every check that keys off it
 * stays correct.
 */
export function appHostLanding(pathname: string): string | null {
  return servedAsIs(pathname) ? null : "/hub"
}
