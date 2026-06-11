"use client"

/**
 * Registers the hub service worker and offers a one-tap "turn on alerts"
 * subscribe flow. Designed for non-technical users: a single button with
 * plain words, no settings to understand. Renders nothing when push is
 * unsupported or not configured on the server.
 */
import { useCallback, useEffect, useState } from "react"
import { BellRing, Check } from "lucide-react"

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

type PushState = "unsupported" | "loading" | "off" | "on" | "denied"

export function PushManager({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState>("loading")

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setState("unsupported")
        return
      }
      try {
        const { publicKey } = await fetch("/api/hub/push").then((r) => r.json())
        if (!publicKey) {
          if (!cancelled) setState("unsupported")
          return
        }
        const registration = await navigator.serviceWorker.register("/hub-sw.js", { scope: "/hub" })
        const existing = await registration.pushManager.getSubscription()
        if (cancelled) return
        if (Notification.permission === "denied") setState("denied")
        else setState(existing ? "on" : "off")
      } catch {
        if (!cancelled) setState("unsupported")
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async () => {
    try {
      setState("loading")
      const { publicKey } = await fetch("/api/hub/push").then((r) => r.json())
      const registration = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off")
        return
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
      await fetch("/api/hub/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      })
      setState("on")
    } catch {
      setState("off")
    }
  }, [])

  if (state === "unsupported" || state === "loading") return null
  if (state === "on") {
    return compact ? null : (
      <p className="flex items-center gap-2 text-body-xs text-steel-300">
        <Check className="h-3.5 w-3.5 text-gold" /> Alerts are on for this device
      </p>
    )
  }
  if (state === "denied") {
    return compact ? null : (
      <p className="text-body-xs text-steel-300">
        Alerts are blocked — allow notifications for this site in your phone settings.
      </p>
    )
  }
  return (
    <button
      onClick={subscribe}
      className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold hover:bg-gold/20"
    >
      <BellRing className="h-4 w-4" />
      Turn on alerts for this device
    </button>
  )
}
