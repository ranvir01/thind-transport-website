"use client"

/**
 * Install guidance for the driver app, marketing side.
 *
 * The two platforms need opposite advice, which is why this is a component and
 * not a paragraph:
 *
 * iOS — /app is a real install surface. The page declares the LoadOff manifest,
 * whose scope is widened to "/" for iOS precisely so it applies here
 * (lib/hub/install-scope.ts), so Share → Add to Home Screen right here installs
 * the app under its own name and icon. The steps say so, and name the tell-tale
 * (the sheet should read "LoadOff") because a wrong install is otherwise silent
 * until someone taps the icon a day later.
 *
 * Android — Chrome only fires beforeinstallprompt for a page inside the
 * manifest's scope, and off iOS that scope stays narrow at /hub so Chrome never
 * swallows marketing links into the app window. So this component never
 * prompts; it sends the driver to /hub/get-app, where InstallAppButton offers
 * the real install sheet.
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
      href="/hub/get-app"
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
        <p className="font-display text-m-h4 font-bold text-ink">On iPhone — you&apos;re on the right page</p>
        <ol className="mt-4 list-none space-y-3">
          <li className={stepCls}>
            <span className={numCls}>1</span>
            <span>
              Tap the Share button{" "}
              <Share className="inline h-4 w-4 align-text-bottom text-ink-3" aria-label="Share" />{" "}
              at the bottom of Safari, then &ldquo;Add to Home Screen&rdquo;.
            </span>
          </li>
          <li className={stepCls}>
            <span className={numCls}>2</span>
            <span>
              The name it offers should read <strong>LoadOff</strong>. That&apos;s how you know
              you&apos;re adding the app and not the website.
            </span>
          </li>
          <li className={stepCls}>
            <span className={numCls}>3</span>
            <span>Tap Add. The app lands on your home screen like any other app.</span>
          </li>
        </ol>
        {/* The one thing that genuinely cannot work: an in-app webview
            (Facebook, Gmail, Chrome for iOS) has no Add to Home Screen at all. */}
        <p className="mt-4 text-m-small text-ink-3">
          No Share button? You&apos;re reading this inside another app — tap its menu, choose
          &ldquo;Open in Safari&rdquo;, and start again from step 1.
        </p>
        <OpenAppCta label="Or open the app's own page" />
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
          <span>Open the app&apos;s install page — the button below takes you there.</span>
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
