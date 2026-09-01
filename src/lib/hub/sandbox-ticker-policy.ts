/**
 * The sim heartbeat's decisions, as pure functions — SimTicker keeps only the
 * DOM plumbing (listeners, timers, fetch). Extracted so the two rules an
 * outside review called out can actually be tested:
 *
 *  · refresh etiquette (E2): never yank the screen out from under someone
 *    mid-thought, and never refresh on a tick that changed nothing.
 *  · idle-stop (A6): a forgotten tab stops churning the database, but coming
 *    BACK to a tab must always tick — that gap is the whole point of
 *    catch-up, and no pointer or key event ever fires while a tab is hidden.
 */

export const TICKER = {
  baseIntervalMs: 25_000,
  jitterMs: 6_000,
  idleStopMs: 30 * 60_000,
  requestTimeoutMs: 20_000,
  /** Failure count that means "this tab shouldn't be ticking at all". */
  standDown: 99,
  maxBackoffSteps: 4,
} as const

export interface BeatContext {
  visible: boolean
  inFlight: boolean
  failures: number
  /** Milliseconds since the last pointerdown/keydown (or tab return). */
  idleForMs: number
  /** A visibility return or first paint: the idle window must not apply. */
  bypassIdle?: boolean
}

export function shouldBeat(ctx: BeatContext): boolean {
  if (!ctx.visible) return false
  if (ctx.inFlight) return false
  if (ctx.failures >= TICKER.standDown) return false
  if (!ctx.bypassIdle && ctx.idleForMs > TICKER.idleStopMs) return false
  return true
}

export interface RefreshContext {
  /** The server said the world actually changed. */
  advanced: boolean
  dialogOpen: boolean
  inputFocused: boolean
}

export function shouldRefresh(ctx: RefreshContext): boolean {
  if (!ctx.advanced) return false
  // A dispatcher mid-booking keeps their form; the next beat refreshes.
  return !ctx.dialogOpen && !ctx.inputFocused
}

/** Backoff grows with consecutive failures; `rand` is 0..1 jitter. */
export function nextDelayMs(failures: number, rand = 0.5): number {
  const backoff = Math.min(failures, TICKER.maxBackoffSteps)
  return (TICKER.baseIntervalMs + (rand - 0.5) * TICKER.jitterMs) * (1 + backoff)
}

/** How a tick response maps to the failure counter. */
export function failuresAfter(
  current: number,
  outcome: { status?: number; networkError?: boolean }
): number {
  if (outcome.networkError) return current + 1
  const status = outcome.status ?? 0
  if (status === 401 || status === 403) return TICKER.standDown // not this tab's world
  if (status >= 400) return current + 1 // a 5xx is a failure, not a fresh start
  return 0
}
