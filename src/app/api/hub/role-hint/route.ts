import { NextResponse } from "next/server"
import { findHubUserByEmail } from "@/lib/hub/users"
import { hubRoleLabel } from "@/lib/hub/landing"
import { isLockedOut, recordAttempt } from "@/lib/hub/auth-throttle"

/** Same body as "no such account" — a 429 would itself be an oracle. */
const EMPTY = { role: null, label: null }

/** Per-IP budget is looser than the email key: several staff behind one NAT. */
const ROLE_HINT_IP_MAX = 20

function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) {
    const first = fwd.split(",")[0]?.trim()
    if (first && first.length <= 64) return first
  }
  const real = request.headers.get("x-real-ip")?.trim()
  if (real && real.length <= 64) return real
  return null
}

/**
 * Read-only role hint for the login page after the user types their email.
 * Unauthenticated by design — so it is throttled like login/signup, on a
 * namespaced key that cannot lock the target out of `/hub/login`.
 */
export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim()
  if (!email || !email.includes("@")) {
    return NextResponse.json(EMPTY)
  }

  const ip = clientIp(request)
  if (await isLockedOut(email, "role-hint")) return NextResponse.json(EMPTY)
  if (ip && (await isLockedOut(`ip:${ip}`, "role-hint", ROLE_HINT_IP_MAX))) {
    return NextResponse.json(EMPTY)
  }

  // Charge before the lookup so "unknown email" still spends budget.
  await recordAttempt(email, false, "role-hint")
  if (ip) await recordAttempt(`ip:${ip}`, false, "role-hint")

  const user = await findHubUserByEmail(email)
  if (!user) return NextResponse.json(EMPTY)
  return NextResponse.json({ role: user.role, label: hubRoleLabel(user.role) })
}
