"use client"

/**
 * Install guidance for the driver app, marketing side.
 *
 * Installability follows the manifest IN SCOPE, and /app sits under the
 * MARKETING site's manifest (start_url "/"), not the driver app's
 * (start_url "/hub"). An earlier version of this component captured
 * beforeinstallprompt right here and called prompt() — which would have put
 * the marketing site on the driver's home screen: the exact wrong-app bug
 * the manifest split (96075898) exists to prevent. So this component never
 * prompts. It detects the platform, explains the two taps, and sends the
 * driver to /hub/login — the first driver-app page reachable without a
 * session — where InstallAppButton offers the REAL install inside the right
 * manifest scope (and iOS Add-to-Home-Screen picks up the right app too).
 *
 * Renders a quiet confirmation when already running standalone, so a driver
 * who has the app isn't told to install it again.
 */

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { Share, Smartphone, Check, ArrowRight } from "lucide-react"
import { track } from "@vercel/analytics"

type InstallEnv = "standalone" | "ios" | "browser"

const subscribeNever = () => () => {}

function readInstallEnv(): InstallEnv {
  if (window.matchMedia("(display-mode: standalone)").matches) return "standalone"
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios"
  return "browser"
}

// Server and hydration must agree, so both assume "installed" — i.e. render the
// quiet state — and the real environment is read on the client.
const readServerInstallEnv = (): InstallEnv => "standalone"

const stepCls = "flex gap-3 text-m-body text-ink-2"
const numCls =
  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal/10 font-mono text-m-micro font-bold text-signal"

function OpenAppCta({ label }: { label: string }) {
  return (
    <Link
      href="/hub/login"
      onClick={() => track("pwa_install_redirect")}
      className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-m-2 bg-signal px-6 py-3 font-display text-m-body font-bold uppercase tracking-wide text-paper transition-colors duration-base ease-entrance hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <Smartphone className="h-4 w-4" aria-hidden /> {label} <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  )
}

export function GetTheApp() {
  const env = useSyncExternalStore(subscribeNever, readInstallEnv, readServerInstallEnv)

  if (env === "standalone") {
    return (
      <div className="flex items-center gap-3 rounded-m-3 border border-cedar/30 bg-cedar/5 p-4">
        <Check className="h-5 w-5 shrink-0 text-cedar" aria-hidden />
        <p className="text-m-body text-ink-2">
          You&apos;re already running the app. Open it from your home screen any time — it works
          without signal.
        </p>
      </div>
    )
  }

  if (env === "ios") {
    return (
      <div className="rounded-m-3 border border-ink/15 bg-paper p-5">
        <p className="font-display text-m-h4 font-bold text-ink">On iPhone</p>
        <ol className="mt-4 list-none space-y-3">
          <li className={stepCls}>
            <span className={numCls}>1</span>
            <span>
              Open the driver app page in <strong>Safari</strong> — the button below takes you
              there. (If you&apos;re reading this inside another app, tap its browser menu and
              choose &ldquo;Open in Safari&rdquo; first.)
            </span>
          </li>
          <li className={stepCls}>
            <span className={numCls}>2</span>
            <span>
              On that page, tap the Share button{" "}
              <Share className="inline h-4 w-4 align-text-bottom text-ink-3" aria-label="Share" />{" "}
              at the bottom of Safari, then &ldquo;Add to Home Screen&rdquo;.
            </span>
          </li>
          <li className={stepCls}>
            <span className={numCls}>3</span>
            <span>Tap Add. The app lands on your home screen like any other app.</span>
          </li>
        </ol>
        <OpenAppCta label="Open the driver app" />
      </div>
    )
  }

  // Android / desktop Chrome: the real install sheet lives on the driver
  // app's own page, where Chrome attributes it to the right manifest.
  return (
    <div className="rounded-m-3 border border-ink/15 bg-paper p-5">
      <p className="font-display text-m-h4 font-bold text-ink">On Android</p>
      <ol className="mt-4 list-none space-y-3">
        <li className={stepCls}>
          <span className={numCls}>1</span>
          <span>Open the driver app page — the button below takes you there.</span>
        </li>
        <li className={stepCls}>
          <span className={numCls}>2</span>
          <span>
            Tap <strong>Install the app on this phone</strong> when it appears, or use
            Chrome&apos;s menu → &ldquo;Install app&rdquo;.
          </span>
        </li>
        <li className={stepCls}>
          <span className={numCls}>3</span>
          <span>Confirm. It opens full-screen from then on, like any other app.</span>
        </li>
      </ol>
      <OpenAppCta label="Open the driver app" />
    </div>
  )
}
