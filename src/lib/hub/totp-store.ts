/**
 * TOTP storage + login-time verification — the impure half of totp.ts.
 *
 * Secrets ride the same AES envelope as integration credentials
 * (encryptPayload/decryptPayload, keyed by CREDENTIALS_KEY), so 2FA inherits
 * the existing key-management story instead of inventing a second one. If
 * CREDENTIALS_KEY is unset, enrollment refuses with a clear message — it
 * must never fall back to plaintext.
 *
 * The pending→enabled promotion happens only after a code verifies, so an
 * abandoned enrollment cannot lock anyone out. Disable requires a current
 * code (or recovery code): a stolen session alone cannot silently strip 2FA.
 */
import { query, queryOne } from "./db"
import { credentialsConfigured, decryptPayload, encryptPayload } from "./credentials"
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  looksLikeRecoveryCode,
  otpauthUrl,
  verifyTotp,
} from "./totp"
import { PRODUCT } from "./product"

interface TotpRow {
  totp_secret_enc: string | null
  totp_pending_secret_enc: string | null
  totp_enabled_at: string | null
  totp_recovery_hashes: string[]
}

async function totpRow(userId: string): Promise<TotpRow | null> {
  return queryOne<TotpRow>(
    `SELECT totp_secret_enc, totp_pending_secret_enc, totp_enabled_at, totp_recovery_hashes
     FROM hub.users WHERE id = $1`,
    [userId]
  )
}

export async function totpEnabled(userId: string): Promise<boolean> {
  const row = await totpRow(userId)
  return Boolean(row?.totp_enabled_at && row.totp_secret_enc)
}

/** Start (or restart) enrollment: mint a secret, store encrypted as PENDING. */
export async function beginTotpEnrollment(
  userId: string,
  email: string
): Promise<{ secret: string; otpauth: string }> {
  if (!credentialsConfigured()) {
    throw new Error("Two-factor setup needs the server encryption key (CREDENTIALS_KEY) configured first.")
  }
  const secret = generateTotpSecret()
  await query(`UPDATE hub.users SET totp_pending_secret_enc = $2 WHERE id = $1`, [
    userId,
    encryptPayload({ secret }),
  ])
  return { secret, otpauth: otpauthUrl(secret, email, PRODUCT.name) }
}

/** Verify a code against the PENDING secret; on success promote to enabled
 * and mint recovery codes (returned in plaintext exactly once). */
export async function confirmTotpEnrollment(
  userId: string,
  code: string
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  const row = await totpRow(userId)
  if (!row?.totp_pending_secret_enc) return { ok: false, error: "No setup in progress — start again." }
  const { secret } = decryptPayload(row.totp_pending_secret_enc)
  if (!secret || !verifyTotp(secret, code)) {
    return { ok: false, error: "That code didn't match — check the app and try the current code." }
  }
  const recoveryCodes = generateRecoveryCodes()
  await query(
    `UPDATE hub.users SET
       totp_secret_enc = totp_pending_secret_enc,
       totp_pending_secret_enc = NULL,
       totp_enabled_at = NOW(),
       totp_recovery_hashes = $2
     WHERE id = $1`,
    [userId, JSON.stringify(recoveryCodes.map(hashRecoveryCode))]
  )
  return { ok: true, recoveryCodes }
}

/** Disable — requires a currently valid code or an unused recovery code. */
export async function disableTotp(
  userId: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const verdict = await verifyLoginTotp(userId, code)
  if (!verdict.ok) return { ok: false, error: "Enter a current code (or a recovery code) to turn 2FA off." }
  await query(
    `UPDATE hub.users SET
       totp_secret_enc = NULL, totp_pending_secret_enc = NULL,
       totp_enabled_at = NULL, totp_recovery_hashes = '[]'::jsonb
     WHERE id = $1`,
    [userId]
  )
  return { ok: true }
}

/**
 * Login-time check. Accepts a TOTP code or a recovery code; a matched
 * recovery code is CONSUMED atomically (the removal is keyed on the hash
 * still being present, so a replayed request cannot reuse it).
 */
export async function verifyLoginTotp(userId: string, code: string): Promise<{ ok: boolean }> {
  const row = await totpRow(userId)
  if (!row?.totp_secret_enc || !row.totp_enabled_at) return { ok: true } // 2FA off → nothing to verify
  const input = code.trim()
  if (input && looksLikeRecoveryCode(input)) {
    const hash = hashRecoveryCode(input)
    const consumed = await query<{ id: string }>(
      `UPDATE hub.users SET totp_recovery_hashes = totp_recovery_hashes - $2
       WHERE id = $1 AND totp_recovery_hashes ? $2 RETURNING id`,
      [userId, hash]
    )
    return { ok: consumed.length > 0 }
  }
  const { secret } = decryptPayload(row.totp_secret_enc)
  return { ok: Boolean(secret) && verifyTotp(secret!, input) }
}
