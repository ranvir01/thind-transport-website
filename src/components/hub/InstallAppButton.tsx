"use client"

/**
 * "Install the app" for the driver phone experience. Chrome/Android exposes
 * beforeinstallprompt — we hold onto it and trigger the native install sheet
 * from a plain button. iOS never fires it, so Safari users get the two-step
 * Share → Add to Home Screen instruction instead. Hidden entirely once the
 * app is already running standalone (i.e. installed).
 */
import { useEffect, useState } from "react"
import { Share, Smartphone } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden")

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIos) setMode("ios")

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setMode("prompt")
    }
    const onInstalled = () => setMode("hidden")
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (mode === "hidden") return null

  if (mode === "prompt" && installEvent) {
    return (
      <button
        onClick={() => installEvent.prompt().catch(() => undefined)}
        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-navy-800/80 px-3 font-display text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-white/5"
      >
        <Smartphone className="h-4 w-4" />
        Install the app on this phone
      </button>
    )
  }

  if (mode === "ios") {
    return (
      <p className="flex items-start gap-2 rounded-2xl border border-white/10 bg-navy-800/80 p-4 text-body-xs text-steel-300">
        <Share className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <span>
          Put LoadOff on your home screen: tap <span className="font-semibold text-white">Share</span>,
          then <span className="font-semibold text-white">Add to Home Screen</span>.
        </span>
      </p>
    )
  }

  return null
}
