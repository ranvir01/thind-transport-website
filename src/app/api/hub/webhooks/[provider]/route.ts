/**
 * Inbound webhook receiver — the push-side front door for integrations
 * (factoring status, ELD events, tracking pings…). Polling providers keep
 * using cron; this exists so providers that PUSH can land data too.
 *
 * Security model: the URL carries the carrier id (?carrier=<uuid>), and the
 * request must be HMAC-SHA256 signed with that carrier's encrypted
 * `webhookSecret` for the provider (Settings → Integrations). Unsigned or
 * mis-signed requests get 401 and store NOTHING. Verified events insert
 * idempotently into hub.integration_events for async processing, and every
 * delivery writes a hub.integration_syncs row for the settings-page history.
 */
import { NextResponse } from "next/server"
import { getCredentials, type IntegrationProvider } from "@/lib/hub/credentials"
import { providerSpec } from "@/lib/hub/integrations/registry"
import {
  EVENT_ID_HEADER, SIGNATURE_HEADER, verifyWebhookSignature, webhookEventId,
} from "@/lib/hub/integrations/webhooks"
import { query, queryOne } from "@/lib/hub/db"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const spec = providerSpec(provider)
  if (!spec) return NextResponse.json({ error: "Unknown provider" }, { status: 404 })

  const carrierId = new URL(req.url).searchParams.get("carrier") ?? ""
  if (!UUID_RE.test(carrierId)) {
    return NextResponse.json({ error: "Missing carrier" }, { status: 400 })
  }
  const carrier = await queryOne<{ id: string }>(
    `SELECT id FROM hub.carriers WHERE id = $1`, [carrierId]
  )
  if (!carrier) return NextResponse.json({ error: "Unknown carrier" }, { status: 404 })

  const rawBody = await req.text()
  const creds = await getCredentials(carrierId, provider as IntegrationProvider)
  const ok = verifyWebhookSignature(rawBody, req.headers.get(SIGNATURE_HEADER), creds?.webhookSecret)
  if (!ok) {
    // Log the rejection (no payload — it is unverified) so probes are visible.
    await query(
      `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, error)
       VALUES ($1, $2, NOW(), NOW(), FALSE, 'webhook signature rejected')`,
      [carrierId, `webhook:${provider}`]
    ).catch(() => {})
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 })
  }

  const externalId = webhookEventId(rawBody, req.headers.get(EVENT_ID_HEADER))
  const kind =
    typeof (payload as Record<string, unknown>)?.event === "string"
      ? String((payload as Record<string, unknown>).event).slice(0, 60)
      : null

  const inserted = await query<{ id: string }>(
    `INSERT INTO hub.integration_events (carrier_id, provider, external_id, kind, payload)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (carrier_id, provider, external_id) DO NOTHING
     RETURNING id`,
    [carrierId, provider, externalId, kind, JSON.stringify(payload)]
  )
  const duplicate = inserted.length === 0

  await query(
    `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, counts)
     VALUES ($1, $2, NOW(), NOW(), TRUE, $3)`,
    [carrierId, `webhook:${provider}`, JSON.stringify({ events: duplicate ? 0 : 1, duplicate })]
  )

  return NextResponse.json({ ok: true, duplicate })
}
