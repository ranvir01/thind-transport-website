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

/** The minimum an element must expose for the focus rules below to judge it. */
export type FocusTarget = {
  tagName?: string | null
  type?: string | null
  isContentEditable?: boolean | null
}

// Inputs that re-activate on Enter exactly like a <button> — focus must still
// be pulled off these, or Enter behind the overlay fires the action twice.
const BUTTON_LIKE_INPUT = /^(button|submit|reset|image|checkbox|radio|file)$/i

/**
 * True when the element accepts typed characters (text/number field, textarea,
 * contenteditable). A `<select>` is not text entry — Space and Enter operate
 * its popup, so it is treated like a button and gives up focus.
 */
export function isTextEntry(el: FocusTarget | null | undefined): boolean {
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = (el.tagName ?? "").toUpperCase()
  if (tag === "TEXTAREA") return true
  if (tag !== "INPUT") return false
  return !BUTTON_LIKE_INPUT.test(el.type ?? "text")
}

/**
 * Whether a milestone overlay may take keyboard focus when it appears.
 *
 * It normally must: the overlay covers the button that triggered it, and
 * leaving focus there lets Enter re-activate that button behind the overlay
 * (a duplicate submit). But the moment arrives a server round-trip after the
 * click, so it can land mid-keystroke — and stealing focus from a field the
 * user is typing into silently swallows every character after that instant.
 *
 * A nightly drive recorded a $2.00 payment against a $2,125.44 open balance
 * exactly this way: the first digit of "2125.44" landed, the overlay mounted
 * and took focus, the remaining six characters went to the overlay div, and
 * the truncated amount submitted under a green "Payment recorded" toast. The
 * overpay guard in recordPayment only catches amounts that are too LARGE.
 */
export function overlayMayTakeFocus(active: FocusTarget | null | undefined): boolean {
  return !isTextEntry(active)
}
