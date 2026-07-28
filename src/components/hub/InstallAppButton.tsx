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
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Share, Smartphone } from "lucide-react"
import { track } from "@vercel/analytics"

/** The install walkthrough, and the one page this component never links to. */
const INSTALL_PAGE = "/hub/get-app"

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
  const onInstallPage = usePathname() === INSTALL_PAGE

  useEffect(() => {
    if (env !== "browser") return
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      track("pwa_prompt_available")
    }
    const onInstalled = () => {
      setInstalled(true)
      track("pwa_install_accepted")
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [env])

  if (installed || env === "standalone") return null

  if (env === "ios") {
    const hint = (
      <>
        Put LoadOff on your home screen: tap{" "}
        <span className={office ? "font-semibold text-fg" : "font-semibold text-white"}>Share</span>, then{" "}
        <span className={office ? "font-semibold text-fg" : "font-semibold text-white"}>Add to Home Screen</span>.
      </>
    )
    const shareIcon = (
      <Share className={office ? "mt-0.5 h-4 w-4 shrink-0 text-accent-text" : "mt-0.5 h-4 w-4 shrink-0 text-gold"} />
    )

    // On the install page itself there is nowhere better to send anyone, and
    // the full steps are already on screen — so the hint stays a hint.
    if (onInstallPage) {
      return (
        <p
          className={
            office
              ? "flex items-start gap-2 rounded-control border border-border bg-surface-2 p-4 text-body-xs text-fg-2"
              : "flex items-start gap-2 rounded-2xl border border-white/10 bg-navy-800/80 p-4 text-body-xs text-steel-300"
          }
        >
          {shareIcon}
          <span>{hint}</span>
        </p>
      )
    }

    // Everywhere else it is a tap target, in the accent colour, because the
    // grey panel it replaced read as small print — drivers scrolled past the
    // one thing on the screen that puts the app on their phone. Tapping opens
    // the walkthrough; the two taps stay written out for anyone who'd rather
    // just do it from here.
    return (
      <Link
        href={INSTALL_PAGE}
        onClick={() => track("pwa_install_help_opened")}
        className={
          office
            // No `/opacity` on accent: it is a CSS variable without an
            // <alpha-value> placeholder, so Tailwind 3 drops the modifier and
            // the tint would render as a solid indigo block. accent-soft is
            // the token that exists for exactly this.
            ? "flex min-h-[52px] w-full items-start gap-2 rounded-control border border-accent bg-accent-soft p-4 text-body-xs text-fg-2 transition-colors hover:border-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            : "flex min-h-[52px] w-full items-start gap-2 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-body-xs text-steel-200 transition-colors hover:border-gold hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        }
      >
        {shareIcon}
        <span className="flex-1">
          {hint}{" "}
          <span className={office ? "font-semibold text-accent-text underline" : "font-semibold text-gold underline"}>
            Show me how
          </span>
        </span>
        <ChevronRight
          className={office ? "mt-0.5 h-4 w-4 shrink-0 text-accent-text" : "mt-0.5 h-4 w-4 shrink-0 text-gold"}
          aria-hidden
        />
      </Link>
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
