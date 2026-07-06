/**
 * Per-carrier integration credentials, encrypted at rest with AES-256-GCM.
 * The key comes from CREDENTIALS_KEY (32+ chars, env only). Without it,
 * credential storage is disabled and every integration stays on the CSV path.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { query, queryOne } from "./db"

export type IntegrationProvider =
  | "terminal" | "truckercloud" | "dat" | "efs" | "wex" | "comdata" | "mailbox"
  | "truckstop" | "qbo" | "factor"

export function credentialsConfigured(): boolean {
  return Boolean(process.env.CREDENTIALS_KEY && process.env.CREDENTIALS_KEY.length >= 16)
}

function key(): Buffer {
  const secret = process.env.CREDENTIALS_KEY
  if (!secret) throw new Error("CREDENTIALS_KEY is not set")
  return createHash("sha256").update(secret).digest()
}

export function encryptPayload(payload: Record<string, string>): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8")
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decryptPayload(envelope: string): Record<string, string> {
  const [ivB64, tagB64, dataB64] = envelope.split(":")
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
  return JSON.parse(plaintext.toString("utf8"))
}

export async function saveCredentials(
  carrierId: string,
  provider: IntegrationProvider,
  payload: Record<string, string>,
  createdBy: string
): Promise<void> {
  const envelope = encryptPayload(payload)
  await query(
    `INSERT INTO hub.api_credentials (carrier_id, provider, encrypted, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (carrier_id, provider) DO UPDATE SET
       encrypted = EXCLUDED.encrypted, updated_at = NOW()`,
    [carrierId, provider, envelope, createdBy]
  )
}

export async function getCredentials(
  carrierId: string,
  provider: IntegrationProvider
): Promise<Record<string, string> | null> {
  if (!credentialsConfigured()) return null
  const row = await queryOne<{ encrypted: string }>(
    `SELECT encrypted FROM hub.api_credentials WHERE carrier_id = $1 AND provider = $2`,
    [carrierId, provider]
  )
  if (!row) return null
  try {
    return decryptPayload(row.encrypted)
  } catch {
    return null
  }
}

export async function hasCredentials(
  carrierId: string,
  provider: IntegrationProvider
): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM hub.api_credentials WHERE carrier_id = $1 AND provider = $2`,
    [carrierId, provider]
  )
  return Boolean(row)
}

export async function deleteCredentials(
  carrierId: string,
  provider: IntegrationProvider
): Promise<void> {
  await query(`DELETE FROM hub.api_credentials WHERE carrier_id = $1 AND provider = $2`, [
    carrierId, provider,
  ])
}
