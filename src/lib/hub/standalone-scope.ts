/**
 * Scope math for the installed app (client-safe, no DOM required here).
 *
 * iOS does not enforce a PWA's manifest scope: a link inside the installed
 * app that points at a marketing page navigates the APP CONTAINER onto the
 * website, and there's no URL bar to escape with — the owner's exact "opened
 * the app, got the website" report. The guard component intercepts those
 * clicks when running standalone and hands them to the real browser instead,
 * so the app container never leaves /hub.
 */

/**
 * True when a same-origin link would take the app container outside the app.
 *
 * `onAppOrigin` is the app's own domain, where the whole origin is the app —
 * nothing same-origin escapes, and treating "/" as an escape there would hand
 * the app's own home page to the browser on every logo tap.
 */
export function escapesAppScope(
  href: string,
  currentOrigin: string,
  onAppOrigin = false
): boolean {
  let url: URL
  try {
    url = new URL(href, currentOrigin)
  } catch {
    return false
  }
  // Cross-origin links (FMCSA SAFER etc.) already open outside; special
  // schemes (tel:, mailto:, sms:) are handed to the OS either way.
  if (url.origin !== currentOrigin) return false
  if (!/^https?:$/.test(url.protocol)) return false
  // On the app's own origin there is nowhere same-origin to escape TO.
  if (onAppOrigin) return false
  const p = url.pathname
  // /api stays: the app's own fetches and file downloads live there.
  return !(p === "/hub" || p.startsWith("/hub/") || p === "/api" || p.startsWith("/api/"))
}
