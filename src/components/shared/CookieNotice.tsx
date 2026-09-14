"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { shouldHideMobileCommandBar } from "@/components/cinematic/Footer"

/** Bump the suffix to show the notice again after a material change to it. */
const STORAGE_KEY = "tt-cookie-notice-v1"

/** The app surfaces carry their own chrome; the notice is a marketing-site thing. */
const isAppRoute = (pathname: string): boolean =>
  pathname.startsWith("/hub") ||
  pathname.startsWith("/driver") ||
  pathname.startsWith("/track") ||
  pathname.startsWith("/api")

// A one-flag external store, read through useSyncExternalStore rather than
// useState-in-an-effect (same reasoning as AttributionField): the server
// snapshot says "dismissed", so SSR and the hydration pass render nothing and
// the bar appears only once the client can actually read localStorage.
const listeners = new Set<() => void>()
/** Covers storage that is blocked (private mode, quota): hide for this page view. */
let dismissedThisPageView = false

const subscribe = (onChange: () => void) => {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

const readDismissed = (): boolean => {
  if (dismissedThisPageView) return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

const readDismissedOnServer = (): boolean => true

const dismiss = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1")
  } catch {
    // Storage blocked: the flag above still hides the bar until reload.
  }
  dismissedThisPageView = true
  listeners.forEach((notify) => notify())
}

/**
 * A slim, non-blocking notice — not a consent gate. Analytics here are
 * cookieless (Vercel Web Analytics), so there is nothing to consent to; the
 * bar just says so once, and "Got it" remembers that in localStorage.
 */
export const CookieNotice = () => {
  const pathname = usePathname()
  const dismissed = useSyncExternalStore(subscribe, readDismissed, readDismissedOnServer)

  if (dismissed || isAppRoute(pathname)) return null

  // Below md the MobileCommandBar (fixed bottom-0 z-[90] md:hidden) owns the
  // bottom edge on every route where it can mount; sit above it there. From
  // md, and on routes where the bar never mounts, sit on the edge itself.
  const aboveCommandBar = !shouldHideMobileCommandBar(pathname)

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className={`fixed inset-x-0 z-[95] border-t border-white/10 bg-navy-950/95 text-steel-200 motion-safe:animate-slide-up ${
        aboveCommandBar
          ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-0"
          : "bottom-0"
      }`}
    >
      <div
        className={`container flex flex-col gap-3 pt-3 text-m-micro sm:flex-row sm:items-center sm:justify-between ${
          aboveCommandBar
            ? "pb-3"
            : "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:pb-3"
        }`}
      >
        <p>
          <span>
            We don&apos;t use advertising or tracking cookies. Analytics are anonymous and
            cookieless; a small preference cookie remembers your audience choice.{" "}
          </span>
          <Link
            href="/privacy"
            className="font-semibold text-steel-200 underline underline-offset-4 transition-colors hover:text-white"
          >
            Privacy policy
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-fleet border border-white/15 bg-white/5 px-4 font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/15"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
