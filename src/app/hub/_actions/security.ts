"use server"

/**
 * Personal security actions — 2FA enrollment lifecycle. Any signed-in hub
 * user manages their OWN second factor; no role can toggle someone else's
 * (an owner resetting a locked-out user's 2FA is deliberately a future,
 * audited admin action — silently strippable 2FA isn't 2FA).
 */
import { getActiveHubUser, type HubSessionUser } from "@/lib/hub/session"

/**
 * Any signed-in hub user — drivers included; 2FA is for every account.
 * getActiveHubUser, not getHubUser: a deactivated account or suspended
 * workspace must not keep 2FA lifecycle control for the JWT's lifetime
 * (strip its own second factor, re-enroll a fresh secret).
 */
async function requireHubUser(): Promise<HubSessionUser> {
  const user = await getActiveHubUser()
  if (!user) throw new Error("Not signed in")
  return user
}
import { beginTotpEnrollment, confirmTotpEnrollment, disableTotp, totpEnabled } from "@/lib/hub/totp-store"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"

export async function totpStatusAction(): Promise<{ enabled: boolean }> {
  const user = await requireHubUser()
  return { enabled: await totpEnabled(user.id) }
}

export async function beginTotpEnrollmentAction(): Promise<
  { ok: true; otpauth: string; secret: string } | { ok: false; error: string }
> {
  try {
    const user = await requireHubUser()
    const { secret, otpauth } = await beginTotpEnrollment(user.id, user.email)
    return { ok: true, otpauth, secret }
  } catch (err) {
    return actionError(err, "Could not start 2FA setup")
  }
}

export async function confirmTotpEnrollmentAction(
  code: string
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  try {
    const user = await requireHubUser()
    const result = await confirmTotpEnrollment(user.id, code)
    if (result.ok) {
      await logAudit({
        carrierId: user.carrierId, actorId: user.id,
        entityType: "user", entityId: user.id, action: "totp_enabled",
      })
    }
    return result
  } catch (err) {
    return actionError(err, "Could not verify the code")
  }
}

export async function disableTotpAction(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireHubUser()
    const result = await disableTotp(user.id, code)
    if (result.ok) {
      await logAudit({
        carrierId: user.carrierId, actorId: user.id,
        entityType: "user", entityId: user.id, action: "totp_disabled",
      })
    }
    return result
  } catch (err) {
    return actionError(err, "Could not turn off 2FA")
  }
}
