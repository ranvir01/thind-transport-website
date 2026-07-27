"use client"

import { useSyncExternalStore } from "react"
import { ATTRIBUTION_FIELD, readAttribution, serializeAttribution } from "@/lib/attribution"

/**
 * Hidden input carrying this visit's attribution into a form submission.
 *
 * sessionStorage is external state that React doesn't own, so this is
 * useSyncExternalStore rather than useState-in-an-effect: it gives a distinct
 * server snapshot (empty, since sessionStorage doesn't exist during SSR) and a
 * client snapshot, which is exactly the hydration-mismatch problem here, and
 * it avoids setting state from an effect.
 *
 * The snapshot is cached because useSyncExternalStore compares with Object.is
 * on every render — re-parsing and re-stringifying each time would be wasted
 * work even though equal strings compare true.
 *
 * A form submitted before hydration sends an empty value, which the server
 * treats as direct traffic — the same outcome as a visitor with storage
 * blocked. Never worth failing a submission over.
 */

let cached: string | null = null

function getSnapshot(): string {
  if (cached === null) cached = serializeAttribution(readAttribution())
  return cached
}

/** Captured once on landing and never mutated afterwards, so nothing to subscribe to. */
function subscribe(): () => void {
  return () => {}
}

export function AttributionField() {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => "")
  return <input type="hidden" name={ATTRIBUTION_FIELD} value={value} readOnly />
}
