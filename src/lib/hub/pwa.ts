/**
 * Client-side helpers for the installed-app (PWA) experience. Everything here
 * is progressive: on browsers without the API the calls are silent no-ops.
 */

interface BadgeNavigator {
  setAppBadge?: (count: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
  serviceWorker?: ServiceWorkerContainer
}

/**
 * Mirror the unread notification count onto the installed app's icon
 * (Android/desktop Chrome; iOS 16.4+ for installed PWAs). Zero clears it.
 */
export function applyAppBadge(
  unread: number,
  nav: BadgeNavigator | undefined = typeof navigator === "undefined" ? undefined : navigator
): void {
  if (!nav) return
  try {
    if (unread > 0) nav.setAppBadge?.(unread)?.catch?.(() => {})
    else nav.clearAppBadge?.()?.catch?.(() => {})
  } catch {
    /* badge is decoration — never let it break the page */
  }
}

/**
 * Tell the service worker to drop every cached hub screen. Called on
 * sign-out so the offline shell can't show one user's screens to the next
 * person on a shared device. Fire-and-forget: sign-out must never hang on it.
 */
export function clearShellCache(
  nav: BadgeNavigator | undefined = typeof navigator === "undefined" ? undefined : navigator
): void {
  try {
    nav?.serviceWorker?.getRegistration("/hub").then(
      (reg) => reg?.active?.postMessage("hauldesk-clear-shell"),
      () => {}
    )
  } catch {
    /* no SW — nothing cached, nothing to clear */
  }
}
