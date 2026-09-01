/**
 * Auth throttling (Phase 7 security pass): DB-backed so it works on
 * serverless. Five failures on a key inside 15 minutes → locked 15
 * minutes. Best-effort: a database outage must never lock everyone out.
 *
 * hub.auth_attempts.email is the throttle KEY, not necessarily an email —
 * signup keys on an email AND on a client IP. Scopes never share a key:
 * "login" keeps the bare lowercased email it has always used (existing rows
 * and the login caller are untouched), every other scope is namespaced
 * `scope:key`, so hammering signup with someone else's address can never
 * lock that person out of logging in.
 */
import { query, queryOne } from "./db"
import { hubDbAvailable } from "./db-available"

export type ThrottleScope = "login" | "signup" | "public-form"

/**
 * Per-scope budgets. login/signup keep the historical 5-in-15. public-form is
 * deliberately looser: those keys count every SUBMISSION (not every failure),
 * and one office behind a corporate NAT legitimately submits several driver
 * referrals plus typo-resubmits from a single IP — the budget has to absorb a
 * whole recruiting afternoon while still stopping a bot from burning the SMTP
 * quota, which needs hundreds of sends to matter, not twenty.
 */
const SCOPE_LIMITS: Record<ThrottleScope, { windowMinutes: number; maxFailures: number }> = {
  login: { windowMinutes: 15, maxFailures: 5 },
  signup: { windowMinutes: 15, maxFailures: 5 },
  "public-form": { windowMinutes: 15, maxFailures: 20 },
}

function throttleKey(identifier: string, scope: ThrottleScope): string {
  const key = identifier.trim().toLowerCase()
  return scope === "login" ? key : `${scope}:${key}`
}

export async function isLockedOut(
  identifier: string,
  scope: ThrottleScope = "login",
  maxOverride?: number
): Promise<boolean> {
  if (!hubDbAvailable()) return false
  const { windowMinutes, maxFailures } = SCOPE_LIMITS[scope]
  try {
    const row = await queryOne<{ failures: string }>(
      `SELECT COUNT(*) AS failures FROM hub.auth_attempts
       WHERE email = $1 AND success = FALSE AND attempted_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
      [throttleKey(identifier, scope)]
    )
    return Number(row?.failures ?? 0) >= (maxOverride ?? maxFailures)
  } catch {
    return false
  }
}

/**
 * Record one attempt against the key's budget. `success: false` is what counts
 * toward the lockout — for signup every attempt is recorded as chargeable,
 * because a *created* workspace is exactly the cost being rate-limited.
 */
export async function recordAttempt(
  identifier: string,
  success: boolean,
  scope: ThrottleScope = "login"
): Promise<void> {
  if (!hubDbAvailable()) return
  const key = throttleKey(identifier, scope)
  try {
    await query(`INSERT INTO hub.auth_attempts (email, success) VALUES ($1, $2)`, [key, success])
    if (success) {
      // A good login clears the slate (and keeps the table tidy).
      await query(
        `DELETE FROM hub.auth_attempts WHERE email = $1 AND attempted_at < NOW() - INTERVAL '1 day'`,
        [key]
      )
    }
  } catch {
    /* never block login on bookkeeping */
  }
}
