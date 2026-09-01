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

export interface ShareNavigator {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>
  canShare?: (data: { title?: string; text?: string; url?: string }) => boolean
  clipboard?: { writeText: (text: string) => Promise<void> }
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed"

/** Whether this device can open a native share sheet (phones, mostly). */
export function canShareLinks(
  nav: ShareNavigator | undefined = typeof navigator === "undefined" ? undefined : navigator
): boolean {
  return typeof nav?.share === "function"
}

/**
 * Hand a link to the phone's share sheet (SMS, WhatsApp, email — whatever
 * the broker actually reads), falling back to the clipboard where there is
 * no sheet. "cancelled" is the person closing the sheet — not an error.
 */
export async function shareLink(
  data: { title: string; text?: string; url: string },
  nav: ShareNavigator | undefined = typeof navigator === "undefined" ? undefined : navigator
): Promise<ShareOutcome> {
  if (nav?.share && (!nav.canShare || nav.canShare(data))) {
    try {
      await nav.share(data)
      return "shared"
    } catch (err) {
      if ((err as { name?: unknown } | null)?.name === "AbortError") return "cancelled"
      // A sheet that couldn't open still leaves the clipboard route.
    }
  }
  if (!nav?.clipboard) return "failed"
  try {
    await nav.clipboard.writeText(data.url)
    return "copied"
  } catch {
    return "failed"
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
