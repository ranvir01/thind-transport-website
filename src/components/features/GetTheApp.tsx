"use client"

/**
 * Install prompt for the driver app, marketing side.
 *
 * Intentionally NOT reusing components/hub/InstallAppButton: that one belongs to
 * the driver PWA, which this redesign is scoped to leave alone, and it is styled
 * against the hub's forced-dark tokens. The detection logic is the same shape
 * because the platform behaviour is the same — Chrome/Android fires
 * beforeinstallprompt and gives us a native install sheet, iOS never fires it
 * and needs the Share → Add to Home Screen instruction instead.
 *
 * Renders nothing but a confirmation once the app is already installed, so a
 * driver who has it doesn't get told to install it again.
 */

import { useEffect, useState, useSyncExternalStore } from "react"
import { Share, Smartphone, Check, MoreVertical } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

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
  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(196,40,32,0.1)] font-mono text-m-micro font-bold text-signal"

export function GetTheApp() {
  const env = useSyncExternalStore(subscribeNever, readInstallEnv, readServerInstallEnv)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (env === "standalone" || installed) {
    return (
      <div className="flex items-center gap-3 rounded-m-3 border border-[rgba(30,107,79,0.3)] bg-[rgba(30,107,79,0.05)] p-4">
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
      <div className="rounded-m-3 border border-[rgba(20,22,24,0.15)] bg-paper p-5">
        <p className="font-display text-m-h4 font-bold text-ink">On iPhone</p>
        <ol className="mt-4 list-none space-y-3">
          <li className={stepCls}>
            <span className={numCls}>1</span>
            <span>
              Tap the Share button{" "}
              <Share className="inline h-4 w-4 align-text-bottom text-ink-3" aria-label="Share" /> at
              the bottom of Safari.
            </span>
          </li>
          <li className={stepCls}>
            <span className={numCls}>2</span>
            <span>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</span>
          </li>
          <li className={stepCls}>
            <span className={numCls}>3</span>
            <span>Tap Add. The Thind icon lands on your home screen like any other app.</span>
          </li>
        </ol>
      </div>
    )
  }

  // Android/desktop Chrome: a real install sheet if the browser has offered one.
  return (
    <div className="rounded-m-3 border border-[rgba(20,22,24,0.15)] bg-paper p-5">
      <p className="font-display text-m-h4 font-bold text-ink">On Android</p>
      {installEvent ? (
        <>
          <p className="mt-2 text-m-body text-ink-2">
            Your browser can install it directly — one tap, no app store.
          </p>
          <button
            onClick={async () => {
              await installEvent.prompt()
              const { outcome } = await installEvent.userChoice
              if (outcome === "accepted") setInstalled(true)
              setInstallEvent(null)
            }}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-m-2 bg-signal px-6 py-3 font-display text-m-body font-bold uppercase tracking-wide text-paper transition-colors duration-base ease-entrance hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <Smartphone className="h-4 w-4" />
            Install the app
          </button>
        </>
      ) : (
        <ol className="mt-4 list-none space-y-3">
          <li className={stepCls}>
            <span className={numCls}>1</span>
            <span>
              Open the menu{" "}
              <MoreVertical className="inline h-4 w-4 align-text-bottom text-ink-3" aria-label="Menu" />{" "}
              in Chrome.
            </span>
          </li>
          <li className={stepCls}>
            <span className={numCls}>2</span>
            <span>Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;.</span>
          </li>
          <li className={stepCls}>
            <span className={numCls}>3</span>
            <span>Confirm. It opens full-screen from then on, like any other app.</span>
          </li>
        </ol>
      )}
    </div>
  )
}
