/**
 * TOTP two-factor auth (RFC 6238 over RFC 4226 HOTP) — implemented on
 * node:crypto directly, because the whole algorithm is ~40 lines and a
 * dependency would be the only thing an auditor had to trust instead of
 * the RFC test vectors at the bottom of totp.test.ts.
 *
 * Decisions pinned here:
 *  - SHA-1, 6 digits, 30-second step: what Google Authenticator, 1Password,
 *    Authy and every mainstream app expect from an otpauth:// URL. SHA-256
 *    TOTP exists in the RFC but real-world app support is inconsistent —
 *    interop beats theoretical strength for a second factor.
 *  - Verification window ±1 step: absorbs clock skew between a driver's
 *    phone and the server without widening the guess space meaningfully.
 *  - Recovery codes are random, shown once, stored only as SHA-256 hashes —
 *    the database can never leak a usable code.
 *
 * Pure module: no DB, no clock reads except through the `now` parameter's
 * default. Storage/enrollment lives in security actions, not here.
 */
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto"

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
export const TOTP_STEP_SECONDS = 30
export const TOTP_DIGITS = 6

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ""
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[\s=-]/g, "")
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) throw new Error("invalid base32 character")
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** RFC 4226 §5.3 — HMAC-SHA1, dynamic truncation, N digits. */
export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const mac = createHmac("sha1", secret).update(msg).digest()
  const offset = mac[mac.length - 1]! & 0x0f
  const code =
    (((mac[offset]! & 0x7f) << 24) |
      (mac[offset + 1]! << 16) |
      (mac[offset + 2]! << 8) |
      mac[offset + 3]!) %
    10 ** digits
  return String(code).padStart(digits, "0")
}

export function totpCode(secretBase32: string, nowMs = Date.now()): string {
  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS)
  return hotp(base32Decode(secretBase32), counter)
}

/** Constant-time comparison; window ±1 step for clock skew. */
export function verifyTotp(secretBase32: string, code: string, nowMs = Date.now()): boolean {
  const cleaned = code.replace(/\s/g, "")
  if (!/^\d{6}$/.test(cleaned)) return false
  const secret = base32Decode(secretBase32)
  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS)
  for (const delta of [0, -1, 1]) {
    const expected = hotp(secret, counter + delta)
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(cleaned))) return true
  }
  return false
}

/** 160-bit secret, the RFC 4226 recommended minimum. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

/**
 * otpauth:// provisioning URL. Issuer in both places per the de-facto
 * standard, so authenticator apps group the entry correctly.
 */
export function otpauthUrl(secretBase32: string, accountEmail: string, issuer: string): string {
  const enc = encodeURIComponent
  return `otpauth://totp/${enc(issuer)}:${enc(accountEmail)}?secret=${secretBase32}&issuer=${enc(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`
}

// ---- Recovery codes -------------------------------------------------------

/** XXXX-XXXX from an unambiguous alphabet (no 0/O/1/I/L). */
export function generateRecoveryCodes(count = 8): string[] {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
  return Array.from({ length: count }, () => {
    const chars = Array.from(randomBytes(8), (b) => alphabet[b % alphabet.length])
    return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`
  })
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().replace(/[\s-]/g, "")).digest("hex")
}

export function looksLikeRecoveryCode(input: string): boolean {
  return /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(input.trim())
}
