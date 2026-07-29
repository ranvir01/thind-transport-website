/**
 * What `scope` the LoadOff manifest claims, and why it is not one value.
 *
 * A manifest is only applied to a document that sits INSIDE its scope — a
 * browser asked to install a page outside it throws the manifest away and falls
 * back to the page's own title, favicon and URL. LoadOff lives at /hub, so a
 * driver tapping Share → Add to Home Screen on /app or /loadoff got a
 * home-screen icon named after the website that opened the website.
 *
 * Widening the scope to "/" fixes that, but the scope is also what stops Chrome
 * on Android from swallowing plain thindtransport.com links into the installed
 * app's window — a customer tapping a marketing link should get a browser, not
 * a TMS shell. iOS never enforces scope for navigation at all (that is what
 * StandaloneScopeGuard is for), so the trade only exists off-iOS:
 *
 *   iOS      → "/"     the manifest applies wherever we link it, and nothing
 *                      is given up, because scope buys us nothing here anyway.
 *   everyone → "/hub"  narrow containment, exactly as before.
 *
 * The install pages are still the pages that link this manifest — this widens
 * where an install can START, never which pages claim to be the app.
 */

/** iPhone/iPad/iPod. iPadOS in desktop mode is indistinguishable server-side; it falls back to the narrow scope, which is the pre-existing behaviour. */
const IOS_USER_AGENT = /iPhone|iPad|iPod/i

/** The app itself. Every start_url and every in-app route lives under this. */
export const APP_SCOPE = "/hub"

export function isIosUserAgent(userAgent: string | null | undefined): boolean {
  return !!userAgent && IOS_USER_AGENT.test(userAgent)
}

/** Scope for the manifest served to this request. See the note above. */
export function manifestScope(userAgent: string | null | undefined): string {
  return isIosUserAgent(userAgent) ? "/" : APP_SCOPE
}
