/**
 * Why every marketing → /hub link is a plain `<a>` and never `next/link`.
 *
 * THE BUG THIS PREVENTS (reported from a real iPhone, 2026-08-04):
 * Standing on /hub/get-app, Share → Add to Home Screen offered
 * "Thind Transport" pointed at https://thindtransport.com/ — the website, not
 * the app — even though the URL bar read /hub/get-app. Typing that same URL
 * directly worked fine. Same URL, two different outcomes.
 *
 * THE MECHANISM:
 * The two products declare different manifests. The root layout declares
 * `/site.webmanifest` (name "Thind Transport", start_url "/"); the hub layout
 * declares `/api/hub/manifest` (name "LoadOff", start_url "/hub"). iOS Safari
 * parses the manifest ONCE, when the document loads, and uses the parsed copy
 * for Add to Home Screen.
 *
 * `next/link` performs a client-side navigation: history.pushState plus a React
 * re-render. The URL changes and React swaps the <link rel="manifest"> href in
 * the DOM — but no new document is loaded, and Safari does not re-parse the
 * manifest on a DOM mutation. It is still holding the marketing manifest from
 * the page you started on, so it offers that manifest's name and start_url.
 * That is precisely the "Thind Transport / thindtransport.com" the owner saw.
 *
 * A plain `<a href>` is a real navigation: new document, fresh <head>, manifest
 * re-parsed. iOS then offers "LoadOff" pointed at /hub, which is the whole
 * point of the get-app page.
 *
 * COST: one full page load when crossing between the website and the app.
 * That boundary is crossed rarely and deliberately, and the two products do not
 * share a client bundle anyway, so there is little to preserve. Correct install
 * behaviour is worth more than a soft transition here.
 *
 * ENFORCEMENT: `src/__tests__/cross-app-links.test.ts` fails the build if a
 * `next/link` to /hub appears outside the hub tree. If you are here because
 * that test failed: use `<a href>`, not `<Link href>`.
 */
export const CROSS_APP_LINK_REASON =
  "Marketing→/hub links must be plain <a> (full page load) so iOS re-parses the " +
  "LoadOff manifest; next/link soft-navigation leaves the marketing manifest " +
  "active and Add to Home Screen saves the website instead of the app."
