/**
 * Focus containment for modal surfaces (P6.1).
 *
 * The mobile navigation drawer closed on Escape and locked body scroll, but Tab
 * walked straight out of it into the page behind — which is still there, still
 * interactive, and now invisible behind a backdrop. A keyboard or screen-reader
 * user tabs "off the end" of the menu and lands somewhere they cannot see. That
 * is a WCAG 2.4.3 (Focus Order) failure, and it was the last one the site's
 * accessibility claim did not cover.
 *
 * Deliberately dependency-free: the selector and the wrap arithmetic are the
 * whole of it, and a focus-trap package would be a new runtime dependency for
 * thirty lines (AGENTS.md: no new heavy dependencies).
 *
 * The DOM query runs on each Tab rather than once on open, because the drawer's
 * accordion sections expand and collapse while it is open — a list captured at
 * open time goes stale the moment someone opens "Drivers".
 */

/**
 * Elements that can hold focus. `[hidden]`, `disabled` and `tabindex="-1"` are
 * excluded; a collapsed accordion section's links are excluded by the
 * offsetParent check in `focusableWithin`, since they are display:none rather
 * than [hidden].
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

/** Visible, focusable descendants of `container`, in document order. */
export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    // offsetParent is null for display:none (collapsed accordion) and for
    // position:fixed elements — the drawer itself is fixed, but its children
    // are not, so this is safe here. getClientRects covers the fixed case.
    (el) => el.offsetParent !== null || el.getClientRects().length > 0
  )
}

/**
 * Given a Tab keydown inside `container`, return the element that should
 * receive focus, or null to let the browser handle it normally.
 *
 * Pure and exported so the wrap logic is testable without a DOM harness at the
 * React level — the bug this prevents is an off-by-one at the boundaries, which
 * is exactly what a unit test pins.
 */
export function nextFocusTarget(
  focusables: HTMLElement[],
  active: Element | null,
  shiftKey: boolean
): HTMLElement | null {
  if (focusables.length === 0) return null

  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const index = focusables.indexOf(active as HTMLElement)

  // Focus escaped the container entirely (or never entered): pull it back to
  // the appropriate end rather than letting Tab continue into the page.
  if (index === -1) return shiftKey ? last : first

  if (shiftKey && active === first) return last
  if (!shiftKey && active === last) return first
  return null // interior move — the browser's own order is correct
}
