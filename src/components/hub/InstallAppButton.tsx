"use client"

/**
 * "Install the app" for the phone experience. Chrome/Android exposes
 * beforeinstallprompt — we hold onto it and trigger the native install sheet
 * from a plain button. iOS never fires it, so Safari users get the two-step
 * Share → Add to Home Screen instruction instead. Hidden entirely once the
 * app is already running standalone (i.e. installed).
 *
 * appearance="driver" (default) uses the forced-dark driver tokens;
 * appearance="office" uses semantic tokens for the office/team screens.
 */
import { useEffect, useState, useSyncExternalStore } from "react"
import { Share, Smartphone } from "lucide-react"

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

// The server (and the hydration pass) must render the same thing regardless of
// device, so it pretends the app is installed — i.e. renders nothing.
const readServerInstallEnv = (): InstallEnv => "standalone"

export function InstallAppButton({ appearance = "driver" }: { appearance?: "driver" | "office" }) {
  const env = useSyncExternalStore(subscribeNever, readInstallEnv, readServerInstallEnv)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const office = appearance === "office"

  useEffect(() => {
    if (env !== "browser") return
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [env])

  if (installed || env === "standalone") return null

  if (env === "ios") {
    return (
      <p
        className={
          office
            ? "flex items-start gap-2 rounded-control border border-border bg-surface-2 p-4 text-body-xs text-fg-2"
            : "flex items-start gap-2 rounded-2xl border border-white/10 bg-navy-800/80 p-4 text-body-xs text-steel-300"
        }
      >
        <Share className={office ? "mt-0.5 h-4 w-4 shrink-0 text-accent-text" : "mt-0.5 h-4 w-4 shrink-0 text-gold"} />
        <span>
          Put LoadOff on your home screen: tap{" "}
          <span className={office ? "font-semibold text-fg" : "font-semibold text-white"}>Share</span>, then{" "}
          <span className={office ? "font-semibold text-fg" : "font-semibold text-white"}>Add to Home Screen</span>.
        </span>
      </p>
    )
  }

  if (installEvent) {
    return (
      <button
        onClick={() => installEvent.prompt().catch(() => undefined)}
        className={
          office
            ? "flex w-full min-h-[52px] items-center justify-center gap-2 rounded-control border border-border-strong bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-hover"
            : "flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-navy-800/80 px-3 font-display text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-white/5"
        }
      >
        <Smartphone className="h-4 w-4" />
        Install the app on this phone
      </button>
    )
  }

  return null
}
