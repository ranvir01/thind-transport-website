/**
 * Login throttling (Phase 7 security pass): DB-backed so it works on
 * serverless. Five failures on an email inside 15 minutes → locked 15
 * minutes. Best-effort: a database outage must never lock everyone out.
 */
import { hubDbAvailable, query, queryOne } from "./db"

const WINDOW_MINUTES = 15
const MAX_FAILURES = 5

export async function isLockedOut(email: string): Promise<boolean> {
  if (!hubDbAvailable()) return false
  try {
    const row = await queryOne<{ failures: string }>(
      `SELECT COUNT(*) AS failures FROM hub.auth_attempts
       WHERE email = $1 AND success = FALSE AND attempted_at > NOW() - INTERVAL '${WINDOW_MINUTES} minutes'`,
      [email.toLowerCase()]
    )
    return Number(row?.failures ?? 0) >= MAX_FAILURES
  } catch {
    return false
  }
}

export async function recordAttempt(email: string, success: boolean): Promise<void> {
  if (!hubDbAvailable()) return
  try {
    await query(`INSERT INTO hub.auth_attempts (email, success) VALUES ($1, $2)`, [
      email.toLowerCase(), success,
    ])
    if (success) {
      // A good login clears the slate (and keeps the table tidy).
      await query(
        `DELETE FROM hub.auth_attempts WHERE email = $1 AND attempted_at < NOW() - INTERVAL '1 day'`,
        [email.toLowerCase()]
      )
    }
  } catch {
    /* never block login on bookkeeping */
  }
}
