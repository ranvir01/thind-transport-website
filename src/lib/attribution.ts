/**
 * Lead attribution — where did this driver or shipper actually come from?
 *
 * Right now every lead lands with `source` set to whichever form it came
 * through ("Shipper/Broker quote request"), which says what they filled in and
 * nothing about what brought them. So there is no way to answer the only
 * marketing question that matters: which page, search, or campaign produces
 * people who actually call back.
 *
 * This captures that once per visit and rides along on every form submission.
 *
 * DESIGN NOTES, each of which is a decision that could reasonably go the other
 * way:
 *
 *  - FIRST TOUCH WINS within a session. A driver who arrives from a Google ad,
 *    reads /pay-rates, then applies from /drivers should be credited to the ad,
 *    not to /drivers. Overwriting on every page view would credit the last
 *    internal page and make every campaign look worthless.
 *
 *  - sessionStorage, not a cookie and not localStorage. A cookie would ride on
 *    every request for no reason; localStorage would credit a visit six weeks
 *    later to an ad that has long since stopped running. Session scope matches
 *    what "this visit" means.
 *
 *  - No personal data, ever. Campaign tags, the referring host, and the landing
 *    path. Not the full referrer URL — that can carry a search query someone
 *    typed, which is theirs, not ours.
 *
 *  - Fails silently. Storage blocked in private mode, an exotic referrer, a
 *    malformed URL — none of it may break a form. An unattributed lead is a
 *    small loss; a lead that doesn't submit is a real one.
 *
 * Client-safe module: no next/headers, no server imports.
 */

export const ATTRIBUTION_FIELD = "attribution"
const STORAGE_KEY = "tt_attribution"

export interface Attribution {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  /** Google / Meta click ids, when an ad platform appends one. */
  gclid?: string
  fbclid?: string
  /** Referring HOST only — never the full URL with its query string. */
  referrer?: string
  /** The path they first landed on this visit. */
  landing?: string
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const
const CLICK_IDS = ["gclid", "fbclid"] as const

/** Trim and cap — these end up in a database and an email subject line. */
function clean(value: string | null | undefined, max = 120): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().slice(0, max)
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Read attribution out of a URL and referrer. Pure, so the precedence rules
 * above are testable without a browser.
 */
export function parseAttribution(url: string, referrer: string | null | undefined): Attribution {
  const result: Attribution = {}
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return result
  }

  for (const key of UTM_KEYS) {
    const value = clean(parsed.searchParams.get(key))
    if (value) result[key] = value
  }
  for (const key of CLICK_IDS) {
    const value = clean(parsed.searchParams.get(key))
    if (value) result[key] = value
  }

  const landing = clean(parsed.pathname, 200)
  if (landing) result.landing = landing

  // Host only. A referrer from a search engine can carry the query the person
  // typed; that belongs to them.
  if (referrer) {
    try {
      const ref = new URL(referrer)
      if (ref.host && ref.host !== parsed.host) {
        const host = clean(ref.host)
        if (host) result.referrer = host
      }
    } catch {
      /* opaque or malformed referrer — skip it */
    }
  }

  return result
}

/** Nothing worth recording? Then don't record an empty object. */
export function isEmptyAttribution(attribution: Attribution): boolean {
  return Object.keys(attribution).length === 0
}

/**
 * Capture on first page of a visit and keep it. Returns what is stored so a
 * caller can use it immediately on the same page as the landing.
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {}
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY)
    if (existing) return JSON.parse(existing) as Attribution

    const fresh = parseAttribution(window.location.href, document.referrer)
    if (isEmptyAttribution(fresh)) return {}
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    return fresh
  } catch {
    // Private mode, storage full, or a blocked cookie jar. Not worth a broken form.
    return {}
  }
}

/** What was captured earlier this visit, for a form on a later page. */
export function readAttribution(): Attribution {
  if (typeof window === "undefined") return {}
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Attribution) : {}
  } catch {
    return {}
  }
}

/**
 * Render for a hidden form field / database column. Returns "" when there is
 * nothing, so a direct visit doesn't store `{}` on every lead.
 */
export function serializeAttribution(attribution: Attribution): string {
  return isEmptyAttribution(attribution) ? "" : JSON.stringify(attribution)
}

/** Server side: parse the hidden field back, defensively. */
export function deserializeAttribution(raw: string | null | undefined): Attribution | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    // Whitelist: only our own keys survive, so a crafted payload can't stuff
    // arbitrary JSON into the column.
    const allowed = [...UTM_KEYS, ...CLICK_IDS, "referrer", "landing"] as const
    const out: Attribution = {}
    for (const key of allowed) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === "string") {
        const cleaned = clean(value, key === "landing" ? 200 : 120)
        if (cleaned) out[key] = cleaned
      }
    }
    return isEmptyAttribution(out) ? null : out
  } catch {
    return null
  }
}

/** One-line summary for a lead email or the leads board. */
export function describeAttribution(attribution: Attribution | null): string {
  if (!attribution || isEmptyAttribution(attribution)) return "Direct / unknown"
  const parts: string[] = []
  if (attribution.utm_source) {
    parts.push(
      [attribution.utm_source, attribution.utm_medium].filter(Boolean).join(" / ")
    )
  } else if (attribution.referrer) {
    parts.push(attribution.referrer)
  } else {
    // Landing path but no campaign and no external referrer: someone typed the
    // address, used a bookmark, or came from an app that strips referrers.
    // Saying "Direct" first stops the board implying a referral that never
    // happened — the landing path is still worth showing, since which page
    // people arrive on directly is itself a useful signal.
    parts.push("Direct")
  }
  if (attribution.utm_campaign) parts.push(`campaign: ${attribution.utm_campaign}`)
  if (attribution.gclid) parts.push("Google Ads click")
  else if (attribution.fbclid) parts.push("Meta click")
  if (attribution.landing) parts.push(`landed on ${attribution.landing}`)
  return parts.length > 0 ? parts.join(" · ") : "Direct / unknown"
}
