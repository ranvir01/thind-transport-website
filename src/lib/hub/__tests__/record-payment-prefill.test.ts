/**
 * Found by the nightly end-to-end regression: paying an invoice in two parts
 * recorded the second payment as $2.00 against a $2,125.44 open balance, with a
 * "Payment recorded" toast and no error at any layer. Two independent defects in
 * the same flow, both guarded here:
 *
 * 1. `RecordPaymentForm` prefills its amount from `openCents` via `useState`,
 *    which reads its initializer only on mount. Every payment calls
 *    `router.refresh()`, so `openCents` drops while the field keeps showing the
 *    amount just recorded — the accountant's next "Record payment" re-submits a
 *    stale figure (an overpay the server action rejects, or a short payment it
 *    accepts). The component must resync the amount when `openCents` changes.
 *
 * 2. `MilestoneMoment` re-pulled keyboard focus on every render for the 2.6s it
 *    was up: its focus effect listed `onDone` in the dep array, and every caller
 *    passes an inline arrow, so the effect re-ran on each render of the screen
 *    underneath. The record-payment form sits directly beneath the overlay, so
 *    the amount being typed into it lost all but the last keystroke (and the
 *    2.6s dismiss timer restarted each render). The focus pull must be
 *    mount-only, and must blur the trigger rather than focus the overlay.
 *
 * No jsdom in this suite (see driver-accent-tokens.test.ts for the same idiom),
 * so these pin the source-level invariants that make the behavior possible.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const MONEY_ACTIONS = readFileSync(join(__dirname, "../../../components/hub/MoneyActions.tsx"), "utf-8")
const MILESTONE = readFileSync(join(__dirname, "../../../components/hub/MilestoneMoment.tsx"), "utf-8")

/** Body of RecordPaymentForm, up to the next top-level `export function`. */
const recordPaymentForm = () => {
  const start = MONEY_ACTIONS.indexOf("export function RecordPaymentForm")
  expect(start).toBeGreaterThan(-1)
  const next = MONEY_ACTIONS.indexOf("\nexport function ", start + 1)
  return MONEY_ACTIONS.slice(start, next === -1 ? undefined : next)
}

describe("RecordPaymentForm resyncs its prefill to the live open balance", () => {
  it("tracks openCents in state so a changed prop can be detected", () => {
    const source = recordPaymentForm()
    // The adjust-state-when-a-prop-changes pattern: remember the openCents the
    // form last synced to, and compare it against the incoming prop.
    expect(source).toMatch(/useState\(openCents\)/)
    expect(source).toMatch(/!==\s*openCents/)
  })

  it("rewrites form.amount from openCents when the prop changes, not only on mount", () => {
    const source = recordPaymentForm()
    // Two writes of the prefill expression: the useState initializer and the
    // resync. One occurrence means the resync is gone and the field goes stale
    // again after the first payment's router.refresh().
    const prefillWrites = source.match(/\(openCents\s*\/\s*100\)\.toFixed\(2\)/g) ?? []
    expect(prefillWrites.length).toBeGreaterThanOrEqual(2)
    expect(source).toMatch(/setForm\(\s*\(f\)\s*=>\s*\(\{\s*\.\.\.f,\s*amount:/)
  })

  it("resets only the amount, so a typed date/method/reference survives the refresh", () => {
    const source = recordPaymentForm()
    const resync = source.slice(source.indexOf("!== openCents"))
    // The resync spreads the previous form rather than rebuilding it, so the
    // other three fields are untouched.
    expect(resync).toMatch(/\.\.\.f/)
    expect(resync.slice(0, resync.indexOf("}"))).not.toMatch(/paidOn|method|reference/)
  })
})

describe("MilestoneMoment does not swallow keystrokes aimed at the form beneath it", () => {
  it("blurs the trigger instead of focusing the overlay", () => {
    expect(MILESTONE).toMatch(/document\.activeElement[^\n]*\)?\?\.blur\(\)/)
    // No focus() call anywhere: focusing the overlay is what ate the digits.
    expect(MILESTONE).not.toMatch(/\.focus\(\)/)
  })

  it("keeps the overlay out of the focus order entirely", () => {
    expect(MILESTONE).not.toMatch(/tabIndex/)
  })

  it("pulls focus once on mount, not on every render", () => {
    // The whole defect: `}, [onDone])` with an inline-arrow onDone re-runs the
    // effect on every parent render, re-blurring mid-keystroke. Empty deps on
    // the effect that blurs is the invariant; the ref below is what makes it
    // safe. (A separate effect may depend on [onDone] to sync that ref.)
    const afterBlur = MILESTONE.slice(MILESTONE.indexOf(".blur()"))
    const deps = afterBlur.slice(afterBlur.indexOf("}, ["))
    expect(deps.startsWith("}, [])")).toBe(true)
  })

  it("reaches the latest onDone through a ref so empty deps stay correct", () => {
    expect(MILESTONE).toMatch(/useRef\(onDone\)/)
    expect(MILESTONE).toMatch(/onDoneRef\.current = onDone/)
    // The timer and the key handler both go through the ref, never the captured prop.
    expect(MILESTONE).toMatch(/onDoneRef\.current\(\)/)
    expect(MILESTONE).not.toMatch(/setTimeout\(onDone,/)
  })

  it("still neutralizes the keys that would re-fire the trigger", () => {
    // Blurring alone stops Enter re-activating the button; the keydown handler
    // stays as the second line of defense (and dismisses the moment).
    expect(MILESTONE).toMatch(/"Escape"/)
    expect(MILESTONE).toMatch(/"Enter"/)
    expect(MILESTONE).toMatch(/e\.preventDefault\(\)/)
  })
})
