/**
 * The heartbeat's two review-mandated rules, pinned. Both were shipped
 * untested and both had real bugs: the idle-stop silently swallowed the
 * visibility-return catch-up (a tab backgrounded 30+ minutes came back to a
 * frozen world), and a quiet tick still reported "advanced", refreshing every
 * open sandbox tab every ~25 seconds for nothing.
 */
import { describe, expect, it } from "vitest"
import {
  failuresAfter,
  nextDelayMs,
  shouldBeat,
  shouldRefresh,
  TICKER,
} from "../sandbox-ticker-policy"

const ctx = (over: Partial<Parameters<typeof shouldBeat>[0]> = {}) => ({
  visible: true,
  inFlight: false,
  failures: 0,
  idleForMs: 0,
  ...over,
})

describe("shouldBeat", () => {
  it("ticks a visible, idle-free tab", () => {
    expect(shouldBeat(ctx())).toBe(true)
  })

  it("never ticks a hidden tab, an in-flight beat, or a stood-down tab", () => {
    expect(shouldBeat(ctx({ visible: false }))).toBe(false)
    expect(shouldBeat(ctx({ inFlight: true }))).toBe(false)
    expect(shouldBeat(ctx({ failures: TICKER.standDown }))).toBe(false)
  })

  it("stops after the idle window — a forgotten tab stops churning the database", () => {
    expect(shouldBeat(ctx({ idleForMs: TICKER.idleStopMs - 1 }))).toBe(true)
    expect(shouldBeat(ctx({ idleForMs: TICKER.idleStopMs + 1 }))).toBe(false)
  })

  it("BUT a tab return always ticks, however long it was hidden", () => {
    // The regression: a hidden tab accrues no pointer/key events, so idle
    // always expires — if bypassIdle didn't win, catch-up could never fire.
    expect(shouldBeat(ctx({ idleForMs: 14 * 3_600_000, bypassIdle: true }))).toBe(true)
  })

  it("a stood-down tab stays down even on return — it isn't ours to tick", () => {
    expect(shouldBeat(ctx({ failures: TICKER.standDown, bypassIdle: true }))).toBe(false)
  })
})

describe("shouldRefresh (etiquette)", () => {
  const r = (over: Partial<Parameters<typeof shouldRefresh>[0]> = {}) =>
    shouldRefresh({ advanced: true, dialogOpen: false, inputFocused: false, ...over })

  it("refreshes only when the world actually changed", () => {
    expect(r()).toBe(true)
    expect(r({ advanced: false })).toBe(false)
  })

  it("never yanks the screen mid-thought", () => {
    expect(r({ dialogOpen: true })).toBe(false)
    expect(r({ inputFocused: true })).toBe(false)
  })

  it("a quiet tick is never a refresh, busy or not", () => {
    expect(r({ advanced: false, dialogOpen: true })).toBe(false)
    expect(r({ advanced: false, inputFocused: true })).toBe(false)
  })
})

describe("failuresAfter", () => {
  it("a good tick clears the counter", () => {
    expect(failuresAfter(3, { status: 200 })).toBe(0)
  })

  it("401/403 stands the tab down for the visit", () => {
    expect(failuresAfter(0, { status: 401 })).toBe(TICKER.standDown)
    expect(failuresAfter(0, { status: 403 })).toBe(TICKER.standDown)
  })

  it("a 5xx or a network error counts as a failure, never a fresh start", () => {
    expect(failuresAfter(2, { status: 500 })).toBe(3)
    expect(failuresAfter(2, { networkError: true })).toBe(3)
  })
})

describe("nextDelayMs", () => {
  it("sits around the base interval when healthy", () => {
    expect(nextDelayMs(0, 0.5)).toBe(TICKER.baseIntervalMs)
    expect(nextDelayMs(0, 0)).toBeLessThan(TICKER.baseIntervalMs)
    expect(nextDelayMs(0, 1)).toBeGreaterThan(TICKER.baseIntervalMs)
  })

  it("backs off with failures, but caps so a recovered server is picked up", () => {
    expect(nextDelayMs(2, 0.5)).toBe(TICKER.baseIntervalMs * 3)
    expect(nextDelayMs(50, 0.5)).toBe(nextDelayMs(TICKER.maxBackoffSteps, 0.5))
  })
})
