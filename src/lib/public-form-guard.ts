/**
 * Throttle + honeypot for the four public, unauthenticated entry points
 * (lead capture, pre-qualification, full application, schedule-meeting).
 * Each of them sends email — and the application builds a PDF — so an
 * unthrottled bot can burn the SMTP quota and fill hub.applicants with junk.
 *
 * Built on hub.auth_attempts via the generalized ThrottleScope rather than a
 * new table or a third-party captcha (AGENTS.md forbids heavy deps; a captcha
 * also costs real applicants, who are the scarce resource here).
 *
 * Two keys, two budgets:
 *  - `ip:<addr>`  — 20 submissions / 15 min (scope default). Loose on purpose:
 *    a recruiting office behind one corporate NAT can submit several referrals
 *    plus typo-resubmits without tripping it, while a bot needs hundreds of
 *    sends for the attack to be worth anything.
 *  - the submitted email — 6 / 15 min. A legitimate person resubmitting after
 *    a validation error stays far under; the same address seven times in
 *    fifteen minutes is a loop, not a driver.
 *
 * Nothing here reveals that a limit exists: callers return their ordinary
 * generic failure copy, and the honeypot path returns a fake success so a bot
 * gets no signal to tune against. Blocked submissions are NOT recorded —
 * with a sliding window, charging attempts made while blocked would let a
 * burst lock a shared IP out indefinitely.
 *
 * Best-effort like the login throttle: if the hub database is unreachable the
 * guard fails open — an outage must never cost a real lead.
 */
import { headers } from "next/headers"
import { isLockedOut, recordAttempt } from "@/lib/hub/auth-throttle"

export { HONEYPOT_FIELD, honeypotTripped } from "@/lib/honeypot"

const EMAIL_MAX_PER_WINDOW = 6

/** Client IP as Vercel presents it; "unknown" off-platform (dev, tests). */
async function clientIp(): Promise<string> {
  try {
    const h = await headers()
    const fwd = h.get("x-forwarded-for")
    if (fwd) return fwd.split(",")[0].trim()
    return h.get("x-real-ip")?.trim() || "unknown"
  } catch {
    return "unknown"
  }
}

/**
 * True when this submission should be silently refused. When allowed, the
 * submission is charged against both budgets.
 */
export async function publicFormBlocked(email?: string | null): Promise<boolean> {
  const ip = await clientIp()
  const keys: { key: string; max?: number }[] = []
  if (ip !== "unknown") keys.push({ key: `ip:${ip}` })
  if (email && email.includes("@")) keys.push({ key: email, max: EMAIL_MAX_PER_WINDOW })

  for (const { key, max } of keys) {
    if (await isLockedOut(key, "public-form", max)) return true
  }
  // Every accepted submission is chargeable (the email/PDF cost is what the
  // budget protects), mirroring how signup charges each attempt.
  for (const { key } of keys) {
    await recordAttempt(key, false, "public-form")
  }
  return false
}

