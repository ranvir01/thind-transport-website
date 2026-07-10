/**
 * Inbound docs mailbox (Phase 6 §8): the office forwards rate cons and broker
 * paperwork to a dedicated address; attachments auto-file to the matching
 * load by reference number in the subject. Unmatched mail goes to a review
 * note — never silently dropped.
 */
import { getCredentials, saveCredentials } from "./credentials"
import { query, queryOne } from "./db"
import { saveDocument } from "./documents"
import { addLoadEvent } from "./loads"

/** Pull a load reference like THD-1042 / LD-23 out of a subject line. */
export function extractReference(subject: string): string | null {
  const match = subject.toUpperCase().match(/\b[A-Z]{2,5}-\d{2,7}\b/)
  return match ? match[0] : null
}

/** Microsoft 365 / Google Workspace both retired plain-password IMAP login — this path lets either through via a standard OAuth2 refresh-token grant instead of the Gmail app-password field. */
export function isOAuthConfigured(creds: Record<string, string>): boolean {
  return Boolean(creds.tokenEndpoint && creds.clientId && creds.clientSecret && creds.refreshToken)
}

async function refreshMailboxAccessToken(
  creds: Record<string, string>
): Promise<{ accessToken: string; rotatedRefreshToken: string | null }> {
  const response = await fetch(creds.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }).toString(),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Docs mailbox OAuth2 token → HTTP ${response.status}`)
  const json = (await response.json()) as { access_token?: string; refresh_token?: string }
  if (!json.access_token) throw new Error("Docs mailbox OAuth2 token response missing access_token")
  const rotatedRefreshToken =
    json.refresh_token && json.refresh_token !== creds.refreshToken ? json.refresh_token : null
  return { accessToken: json.access_token, rotatedRefreshToken }
}

/** Resolves the ImapFlow auth block — XOAUTH2 when Microsoft/Google OAuth2 fields are present, plain password (Gmail app password) otherwise. Persists a rotated refresh token before the next poll needs it. */
export async function resolveMailboxAuth(
  carrierId: string,
  creds: Record<string, string>
): Promise<{ user: string; pass: string } | { user: string; accessToken: string }> {
  if (isOAuthConfigured(creds)) {
    const { accessToken, rotatedRefreshToken } = await refreshMailboxAccessToken(creds)
    if (rotatedRefreshToken) {
      await saveCredentials(carrierId, "mailbox", { ...creds, refreshToken: rotatedRefreshToken }, "system:mailbox")
    }
    return { user: creds.user, accessToken }
  }
  return { user: creds.user, pass: creds.password }
}

export async function pollDocsMailbox(
  carrierId: string
): Promise<{ connected: boolean; filed?: number; unmatched?: number }> {
  const creds = await getCredentials(carrierId, "mailbox")
  if (!creds?.host || !creds?.user) return { connected: false }
  if (!isOAuthConfigured(creds) && !creds.password) return { connected: false }

  const { ImapFlow } = await import("imapflow")
  const { simpleParser } = await import("mailparser")
  const auth = await resolveMailboxAuth(carrierId, creds)
  const client = new ImapFlow({
    host: creds.host,
    port: Number(creds.port ?? 993),
    secure: true,
    auth,
    logger: false,
  })

  let filed = 0
  let unmatched = 0
  await client.connect()
  try {
    const lock = await client.getMailboxLock(creds.folder || "INBOX")
    try {
      const unseen = await client.search({ seen: false })
      for (const uid of (unseen || []).slice(0, 25)) {
        const message = await client.fetchOne(String(uid), { source: true })
        if (!message || !("source" in message) || !message.source) continue
        const parsed = await simpleParser(message.source as Buffer)
        const reference = extractReference(parsed.subject ?? "")
        const load = reference
          ? await queryOne<{ id: string; reference: string }>(
              `SELECT id, reference FROM hub.loads
               WHERE carrier_id = $1 AND upper(reference) = $2 AND deleted_at IS NULL`,
              [carrierId, reference]
            )
          : null

        let attachedHere = 0
        if (load) {
          for (const attachment of parsed.attachments ?? []) {
            if (!attachment.content || attachment.content.length === 0) continue
            if (attachment.content.length > 15 * 1024 * 1024) continue
            const file = new File(
              [new Uint8Array(attachment.content)],
              attachment.filename ?? `attachment-${Date.now()}.pdf`,
              { type: attachment.contentType ?? "application/octet-stream" }
            )
            await saveDocument({
              carrierId,
              entityType: "load",
              entityId: load.id,
              kind: "rate_confirmation",
              file,
            })
            attachedHere++
          }
          if (attachedHere > 0) {
            await addLoadEvent(carrierId, load.id, "document", {
              kind: "rate_confirmation",
              via: "docs mailbox",
              from: parsed.from?.text ?? "unknown sender",
              files: attachedHere,
            }, { id: null, name: "Docs mailbox" })
            filed += attachedHere
          }
        }

        if (!load || attachedHere === 0) {
          unmatched++
          const { notifyRoles } = await import("./notify")
          await notifyRoles(carrierId, ["owner", "dispatcher"], {
            kind: "mailbox",
            title: `Docs mailbox: couldn't file "${(parsed.subject ?? "no subject").slice(0, 60)}"`,
            body: reference
              ? `No load matches ${reference} — file it by hand.`
              : "No load reference in the subject — file it by hand.",
            link: "/hub/settings/integrations",
          })
        }
        await client.messageFlagsAdd(String(uid), ["\\Seen"])
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }

  await query(
    `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, counts)
     VALUES ($1, 'mailbox', NOW(), NOW(), TRUE, $2)`,
    [carrierId, JSON.stringify({ filed, unmatched })]
  )
  return { connected: true, filed, unmatched }
}
