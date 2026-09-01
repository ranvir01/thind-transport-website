/**
 * A stop's arrived/departed time must be the moment the tap happened, not
 * the moment a queued replay finally found signal — detention billing runs
 * off it. Callers send their tap-time; the server keeps it when it's a real
 * timestamp that isn't in the future, and otherwise falls back to "now".
 * Pure so the office action and its offline replay share one rule.
 */

/** Clock skew tolerated before a "future" tap-time is distrusted. */
const FUTURE_SKEW_MS = 5 * 60 * 1000

export function resolveTapTime(at: string | null | undefined, now: number = Date.now()): string {
  if (typeof at === "string" && at.length > 0) {
    const parsed = Date.parse(at)
    if (Number.isFinite(parsed) && parsed <= now + FUTURE_SKEW_MS) {
      return new Date(parsed).toISOString()
    }
  }
  return new Date(now).toISOString()
}
