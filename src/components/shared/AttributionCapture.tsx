"use client"

import { useEffect } from "react"
import { captureAttribution } from "@/lib/attribution"

/**
 * Records where this visit came from, once, on the first page load.
 *
 * Mounted site-wide in the root layout so it runs wherever someone lands —
 * an ad pointing at /pay-rates has to be captured just as reliably as one
 * pointing at the homepage.
 *
 * Renders nothing and takes no props. captureAttribution() is a no-op after
 * the first call in a session, so the layout remounting on navigation costs a
 * single sessionStorage read.
 */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution()
  }, [])
  return null
}
