"use client"

/**
 * Registers the hub service worker for every visitor, independent of push
 * configuration. PushManager used to be the only registrar and bailed out
 * before registering when VAPID keys were unset — leaving the app with no
 * offline shell and no installability on exactly the deployments that
 * hadn't configured push yet. Registration is idempotent, so PushManager
 * calling register() again later is harmless.
 */
import { useEffect } from "react"

export function ServiceWorkerBoot() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/hub-sw.js", { scope: "/hub" }).catch(() => {})
    }
  }, [])
  return null
}
