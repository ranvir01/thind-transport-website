/**
 * Inbound webhook verification + normalization — pure half of the
 * /api/hub/webhooks/[provider] receiver, kept DB/route-free so signature
 * math is unit-tested without a server.
 *
 * Contract: providers sign the RAW request body with HMAC-SHA256 using the
 * per-carrier `webhookSecret` stored (encrypted) in their credentials, and
 * send it hex-encoded in the X-Loadoff-Signature header. Replays are welcome —
 * ingestion is idempotent on (carrier, provider, external id).
 */
import { createHmac, timingSafeEqual, createHash } from "crypto"
import { appPublicOrigin } from "@/lib/app-origin"

export const SIGNATURE_HEADER = "x-loadoff-signature"
export const EVENT_ID_HEADER = "x-loadoff-event-id"

/**
 * Copy-paste inbound URL shown on Settings → Integrations. Prefers
 * NEXT_PUBLIC_APP_HOST so a vendor posts to the app origin once that env
 * is set; until then NEXTAUTH_URL, same as today's cards.
 */
export function integrationWebhookUrl(providerId: string, carrierId: string): string {
  return `${appPublicOrigin()}/api/hub/webhooks/${providerId}?carrier=${carrierId}`
}

export function signWebhookBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
}

/** Constant-time verify; false for missing/malformed rather than throwing. */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHex: string | null | undefined,
  secret: string | null | undefined
): boolean {
  if (!signatureHex || !secret) return false
  const expected = signWebhookBody(rawBody, secret)
  const a = Buffer.from(expected, "hex")
  let b: Buffer
  try {
    b = Buffer.from(signatureHex.trim().toLowerCase(), "hex")
  } catch {
    return false
  }
  if (a.length !== b.length || b.length === 0) return false
  return timingSafeEqual(a, b)
}

/**
 * Stable event id for idempotent storage: the provider's own id when sent,
 * else a content hash — identical replays collapse to one event either way.
 */
export function webhookEventId(rawBody: string, headerEventId: string | null | undefined): string {
  const fromHeader = headerEventId?.trim()
  if (fromHeader) return fromHeader.slice(0, 120)
  return createHash("sha256").update(rawBody, "utf8").digest("hex").slice(0, 40)
}

/**
 * Whether a processor's outcome should mark `hub.integration_events.processed_at`
 * — applied, a deliberate no-op (already recorded / an event kind we don't
 * act on), rather than a transient miss (no matching invoice yet, missing
 * fields) that should stay pending for a later retry. Shared by the webhook
 * route's inline processing and the manual re-drain (`retryUnprocessedEvents`
 * in event-processors.ts) so the two never drift on what counts as "done".
 */
export function isEventOutcomeFinal(outcome: { applied: boolean; reason?: string }): boolean {
  return outcome.applied || outcome.reason === "already recorded" || Boolean(outcome.reason?.startsWith("unhandled event kind"))
}
