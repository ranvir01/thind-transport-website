"use client"

/**
 * Public tracking page (E10): customers leave this tab open for hours.
 * Poll for the latest status/position without a manual reload; stop once
 * the load reaches a terminal state so a finished shipment doesn't keep
 * pinging the server.
 */
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function TrackRefresher({ active }: { active: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(interval)
  }, [active, router])

  return null
}
