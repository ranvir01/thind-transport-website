/**
 * Driver app invites (M11 onboarding): stateless HMAC-signed tokens, so a
 * bulk roster import can email every driver a set-your-password link without
 * a new table. The token IS the invitation — carrier, driver, and email are
 * signed into it with the auth secret, and it expires on its own. Accepting
 * creates the hub.users row (role 'driver', linked driver_id) the driver
 * app guard requires.
 */
import { createHmac, timingSafeEqual } from "crypto"
import bcrypt from "bcrypt"
import { query, queryOne } from "./db"

const INVITE_TTL_DAYS = 7

// Auth.js v5 reads AUTH_SECRET; legacy deploys still set NEXTAUTH_SECRET.
const inviteSecret = () => process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET

export interface DriverInvitePayload {
  carrierId: string
  driverId: string
  email: string
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url")
}

export function createDriverInviteToken(
  payload: DriverInvitePayload,
  now = Date.now()
): string | null {
  const secret = inviteSecret()
  if (!secret || !payload.email.includes("@")) return null
  const body = Buffer.from(
    JSON.stringify({
      c: payload.carrierId,
      d: payload.driverId,
      e: payload.email.trim().toLowerCase(),
      x: Math.floor(now / 1000) + INVITE_TTL_DAYS * 86400,
    })
  ).toString("base64url")
  return `${body}.${sign(body, secret)}`
}

export function verifyDriverInviteToken(
  token: string,
  now = Date.now()
): DriverInvitePayload | null {
  const secret = inviteSecret()
  if (!secret) return null
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const expected = Buffer.from(sign(body, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    if (typeof parsed.c !== "string" || typeof parsed.d !== "string" || typeof parsed.e !== "string") {
      return null
    }
    if (typeof parsed.x !== "number" || parsed.x * 1000 < now) return null
    return { carrierId: parsed.c, driverId: parsed.d, email: parsed.e }
  } catch {
    return null
  }
}

export interface DriverInviteState {
  valid: boolean
  claimed: boolean
  driverName?: string
  carrierName?: string
  email?: string
}

/** Everything the public accept page needs to render, in one call. */
export async function getDriverInviteState(token: string): Promise<DriverInviteState> {
  const payload = verifyDriverInviteToken(token)
  if (!payload) return { valid: false, claimed: false }
  const driver = await queryOne<{ first_name: string; last_name: string }>(
    `SELECT first_name, last_name FROM hub.drivers
     WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [payload.carrierId, payload.driverId]
  )
  if (!driver) return { valid: false, claimed: false }
  const carrier = await queryOne<{ name: string }>(
    `SELECT name FROM hub.carriers WHERE id = $1`,
    [payload.carrierId]
  )
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM hub.users
     WHERE (carrier_id = $1 AND driver_id = $2) OR LOWER(email) = $3`,
    [payload.carrierId, payload.driverId, payload.email]
  )
  return {
    valid: true,
    claimed: Boolean(existing),
    driverName: `${driver.first_name} ${driver.last_name}`,
    carrierName: carrier?.name,
    email: payload.email,
  }
}

/** Accept an invite: creates the driver-app account linked to the roster row. */
export async function acceptDriverInvite(
  token: string,
  input: { password: string }
): Promise<{ ok: boolean; error?: string; email?: string }> {
  const payload = verifyDriverInviteToken(token)
  if (!payload) {
    return { ok: false, error: "This invite link is invalid or expired — ask your carrier for a fresh one" }
  }
  const driver = await queryOne<{ first_name: string; last_name: string }>(
    `SELECT first_name, last_name FROM hub.drivers
     WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [payload.carrierId, payload.driverId]
  )
  if (!driver) return { ok: false, error: "This driver is no longer on the roster" }
  const claimed = await queryOne<{ id: string }>(
    `SELECT id FROM hub.users WHERE carrier_id = $1 AND driver_id = $2`,
    [payload.carrierId, payload.driverId]
  )
  if (claimed) return { ok: false, error: "This driver already has app access — just sign in" }
  const emailTaken = await queryOne<{ id: string }>(
    `SELECT id FROM hub.users WHERE LOWER(email) = $1`,
    [payload.email]
  )
  if (emailTaken) return { ok: false, error: "An account with this email already exists — sign in instead" }

  const hash = await bcrypt.hash(input.password, 10)
  await query(
    `INSERT INTO hub.users (carrier_id, email, password_hash, name, role, driver_id)
     VALUES ($1,$2,$3,$4,'driver',$5)`,
    [payload.carrierId, payload.email, hash, `${driver.first_name} ${driver.last_name}`, payload.driverId]
  )
  return { ok: true, email: payload.email }
}
