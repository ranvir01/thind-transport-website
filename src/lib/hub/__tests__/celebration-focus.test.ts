/**
 * Regression: the milestone overlay must not take keyboard focus away from a
 * field the user is typing into.
 *
 * The nightly HaulDesk drive recorded a $2.00 payment against a $2,125.44 open
 * balance. The amount field had "2" in it when the "First payment in the bank"
 * overlay mounted, its effect called focus() on the overlay div, and the
 * remaining six keystrokes of "2125.44" were delivered to that div and lost.
 * The truncated amount then submitted under a success toast — recordPayment's
 * guard rejects amounts above the open balance, never below it, so nothing
 * downstream could catch it.
 *
 * MilestoneMoment now asks overlayMayTakeFocus(document.activeElement) first.
 */
import { describe, expect, it } from "vitest"
import { isTextEntry, overlayMayTakeFocus } from "@/lib/hub/celebrations"

const el = (tagName: string, type?: string, isContentEditable = false) => ({
  tagName,
  type,
  isContentEditable,
})

describe("isTextEntry", () => {
  it("treats value-entry inputs as text entry", () => {
    for (const type of ["text", "number", "email", "tel", "search", "password", "date", undefined]) {
      expect(isTextEntry(el("INPUT", type)), `input[type=${type}]`).toBe(true)
    }
    expect(isTextEntry(el("TEXTAREA"))).toBe(true)
    expect(isTextEntry(el("DIV", undefined, true))).toBe(true)
  })

  it("treats button-like inputs and non-fields as not text entry", () => {
    for (const type of ["button", "submit", "reset", "image", "checkbox", "radio", "file"]) {
      expect(isTextEntry(el("INPUT", type)), `input[type=${type}]`).toBe(false)
    }
    // Space and Enter drive a select's popup rather than typing into it, so it
    // must still give up focus like a button.
    expect(isTextEntry(el("SELECT"))).toBe(false)
    expect(isTextEntry(el("BUTTON"))).toBe(false)
    expect(isTextEntry(el("DIV"))).toBe(false)
    expect(isTextEntry(el("BODY"))).toBe(false)
    expect(isTextEntry(null)).toBe(false)
    expect(isTextEntry(undefined)).toBe(false)
  })

  it("matches input types case-insensitively", () => {
    expect(isTextEntry(el("input", "SUBMIT"))).toBe(false)
    expect(isTextEntry(el("input", "Number"))).toBe(true)
  })
})

describe("overlayMayTakeFocus", () => {
  it("refuses to take focus from the money amount field mid-entry", () => {
    // This exact element is #pay_amount on the invoice detail screen.
    expect(overlayMayTakeFocus(el("INPUT", "number"))).toBe(false)
  })

  it("still takes focus off the button that triggered the moment", () => {
    // The duplicate-submit hazard the focus() call exists for.
    expect(overlayMayTakeFocus(el("BUTTON"))).toBe(true)
    expect(overlayMayTakeFocus(el("INPUT", "submit"))).toBe(true)
  })

  it("takes focus when nothing is focused", () => {
    expect(overlayMayTakeFocus(el("BODY"))).toBe(true)
    expect(overlayMayTakeFocus(null)).toBe(true)
  })
})
