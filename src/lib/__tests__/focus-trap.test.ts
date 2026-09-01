/**
 * P6.1: the mobile navigation drawer closed on Escape and locked body scroll,
 * but Tab walked straight out of it into the page behind — still interactive,
 * now invisible behind the backdrop. WCAG 2.4.3, and the last accessibility
 * failure the site's own claim did not cover.
 *
 * nextFocusTarget is the whole of the wrap logic, and the bug a focus trap
 * actually ships with is an off-by-one at the boundaries: trapping forward but
 * not backward, or letting the first Shift+Tab escape. Those are the cases
 * below. The DOM query lives in focusableWithin and is exercised through the
 * drawer itself; this pins the arithmetic.
 */
import { describe, expect, it } from "vitest"
import { nextFocusTarget } from "../focus-trap"

/** Stand-ins — nextFocusTarget only ever compares identity and index. */
const el = (name: string) => ({ name }) as unknown as HTMLElement
const a = el("a")
const b = el("b")
const c = el("c")
const ring = [a, b, c]

describe("nextFocusTarget", () => {
  it("wraps forward off the last element to the first", () => {
    expect(nextFocusTarget(ring, c, false)).toBe(a)
  })

  it("wraps backward off the first element to the last", () => {
    // The half that gets forgotten: Shift+Tab on the first item is exactly how
    // focus escapes a drawer that only guards the forward direction.
    expect(nextFocusTarget(ring, a, true)).toBe(c)
  })

  it("leaves interior moves to the browser", () => {
    // Returning a target here would fight the native order and break
    // shift-tabbing through a list.
    expect(nextFocusTarget(ring, b, false)).toBeNull()
    expect(nextFocusTarget(ring, b, true)).toBeNull()
  })

  it("does not wrap forward off the first element", () => {
    expect(nextFocusTarget(ring, a, false)).toBeNull()
  })

  it("does not wrap backward off the last element", () => {
    expect(nextFocusTarget(ring, c, true)).toBeNull()
  })

  it("pulls focus back in when it has escaped the container", () => {
    // Focus can start outside: the drawer mounts, or a click lands on the
    // backdrop. Tab must re-enter rather than continue through the page.
    const outsider = el("outside")
    expect(nextFocusTarget(ring, outsider, false)).toBe(a)
    expect(nextFocusTarget(ring, outsider, true)).toBe(c)
  })

  it("pulls focus in when nothing is focused at all", () => {
    expect(nextFocusTarget(ring, null, false)).toBe(a)
    expect(nextFocusTarget(ring, null, true)).toBe(c)
  })

  it("does nothing when the container holds nothing focusable", () => {
    // An empty drawer must not throw or focus undefined.
    expect(nextFocusTarget([], a, false)).toBeNull()
    expect(nextFocusTarget([], null, true)).toBeNull()
  })

  it("traps a single focusable element onto itself in both directions", () => {
    // Degenerate ring: first and last are the same node, so both branches fire.
    expect(nextFocusTarget([a], a, false)).toBe(a)
    expect(nextFocusTarget([a], a, true)).toBe(a)
  })

  it("survives the accordion changing the ring between keypresses", () => {
    // The drawer re-queries on every Tab because expanding a section adds
    // links. An element that was last a moment ago may now be interior.
    expect(nextFocusTarget([a, b], b, false)).toBe(a)
    expect(nextFocusTarget([a, b, c], b, false)).toBeNull()
  })
})
