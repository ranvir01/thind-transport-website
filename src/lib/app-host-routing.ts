/**
 * Path mapping for the app's own origin.
 *
 * The app's routes live under /hub in the Next router and always will — moving
 * every file would touch hundreds of imports for no behavioural gain. On the
 * app's own origin the segment is simply hidden: the request for "/" is
 * rewritten to "/hub" before the router sees it, so the origin's root IS the
 * app. That is what lets the manifest claim `scope: "/"` and `start_url: "/"`
 * honestly, which is the whole point of the split — no per-platform scope
 * branching, because there is no marketing page on this origin to be out of
 * scope of.
 *
 * Pure and separately tested: a wrong rule here rewrites something into a 404
 * on every page of the app at once.
 */

/** Paths the app origin serves unchanged, and why each one has to be exempt. */
function servedAsIs(pathname: string): boolean {
  // Already an app route. Internal links and redirects all point at /hub/…,
  // so without this the rewrite would double the segment into /hub/hub/….
  if (pathname === "/hub" || pathname.startsWith("/hub/")) return true
  // The app's own fetches, auth callbacks, file downloads and the manifest.
  if (pathname === "/api" || pathname.startsWith("/api/")) return true
  // Framework and metadata routes that must resolve at the root of any origin.
  if (pathname.startsWith("/_next/")) return true
  if (pathname.startsWith("/.well-known/")) return true
  // Separate surfaces, same as the standalone rescue exempts: the legacy
  // driver portal, and public load tracking a broker opens from an email.
  if (pathname === "/driver" || pathname.startsWith("/driver/")) return true
  if (pathname === "/track" || pathname.startsWith("/track/")) return true
  // Static files — icons, the manifest, robots.txt. A rewrite would 404 them,
  // and the app's icons are exactly what an install needs to resolve.
  if (/\.[a-z0-9]+$/i.test(pathname)) return true
  return false
}

/**
 * The path to serve for a request on the app's own origin, or null to leave it
 * alone. Callers only invoke this when the host is the app host.
 *
 * Marketing paths (/loadoff, /apply, …) map into /hub/* and 404 there, which is
 * intended: those pages belong to the website's origin, and a 404 is the honest
 * answer rather than serving the carrier's marketing off the product's domain.
 */
export function appHostRewrite(pathname: string): string | null {
  if (servedAsIs(pathname)) return null
  if (pathname === "/") return "/hub"
  return `/hub${pathname}`
}
