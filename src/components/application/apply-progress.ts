/**
 * Progress math for the /apply wizard, extracted so the mapping is testable.
 *
 * The old inline formula (`((step - 1) / 4) * 100`, with a `0 → 25` render
 * hack) showed 25% on BOTH step 1 and step 2 — a driver who finished the
 * qualify step saw zero bar movement for their effort — and capped the final
 * step at 75%. Endowed progress is a real conversion lever on mobile forms:
 * the bar must visibly advance on every step and read near-done at the end.
 */
export const APPLY_TOTAL_STEPS = 4

/** Phone first so dispatch can call even if the driver bounces on CDL class. */
export const APPLY_STEP_LABELS = ["Contact", "Qualify", "Details", "Docs"] as const

export function applyProgressPercent(step: number): number {
  const clamped = Math.min(Math.max(step, 1), APPLY_TOTAL_STEPS)
  return Math.round((clamped / APPLY_TOTAL_STEPS) * 100)
}

/**
 * Several recruiting pages already deep-link to /apply?type=company|owner and
 * (now) &lane=local|regional|otr. The form used to ignore those params and
 * always pre-select owner-operator + regional — so a company-driver tap from
 * /veterans or a "home daily" tap from the homepage landed on the wrong track.
 */
export type ApplyDriverType = "owner-operator-otr" | "regional-company-driver"
export type ApplyRouteType = "local" | "regional" | "otr"

export function applyPrefFromSearch(search: string): {
  driverType?: ApplyDriverType
  routeType?: ApplyRouteType
} {
  const raw = search.startsWith("?") ? search.slice(1) : search
  const params = new URLSearchParams(raw)
  const type = (params.get("type") || "").toLowerCase()
  const lane = (params.get("lane") || "").toLowerCase()
  const out: { driverType?: ApplyDriverType; routeType?: ApplyRouteType } = {}
  if (type === "company" || type === "company-driver") {
    out.driverType = "regional-company-driver"
  } else if (type === "owner" || type === "owner-operator" || type === "oo") {
    out.driverType = "owner-operator-otr"
  }
  if (lane === "local" || lane === "regional" || lane === "otr") {
    out.routeType = lane
  }
  return out
}
