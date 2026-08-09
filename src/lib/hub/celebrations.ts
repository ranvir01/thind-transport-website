/**
 * Milestone celebrations — client-side preferences + once-only firing.
 *
 * Celebrations mark FIRSTS (first invoice sent, first invoice paid), never
 * routine events, and each event type fires exactly once per browser. The
 * Appearance menu exposes an off switch; both live in localStorage because
 * they are per-person feel preferences, not tenant data.
 */

const ENABLED_KEY = "hauldesk-celebrations"
const FIRED_KEY = "hauldesk-celebrations-fired"

export function celebrationsEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(ENABLED_KEY) !== "off"
  } catch {
    return false
  }
}

export function setCelebrationsEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(ENABLED_KEY, on ? "on" : "off")
  } catch {
    /* storage unavailable — the toggle just won't persist */
  }
}

function firedSet(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FIRED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

/**
 * True exactly once per event id (e.g. "invoice-sent") per browser, and only
 * while celebrations are enabled. Marks the event fired as a side effect.
 */
export function shouldCelebrate(eventId: string): boolean {
  if (typeof window === "undefined") return false
  if (!celebrationsEnabled()) return false
  const fired = firedSet()
  if (fired.has(eventId)) return false
  fired.add(eventId)
  try {
    window.localStorage.setItem(FIRED_KEY, JSON.stringify([...fired]))
  } catch {
    /* if we can't record it, still celebrate this one */
  }
  return true
}
