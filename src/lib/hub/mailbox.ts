/**
 * Inbound docs mailbox (Phase 6 §8): the office forwards rate cons and broker
 * paperwork to a dedicated address; attachments auto-file to the matching
 * load by reference number in the subject. Unmatched mail goes to a review
 * note — never silently dropped.
 */
import { getCredentials } from "./credentials"
import { queryOne } from "./db"
import { saveDocument } from "./documents"
import { addLoadEvent } from "./loads"
import { defaultImapHost, resolveMailboxAuth } from "./mailbox-oauth"

/** Pull a load reference like THD-1042 / LD-23 out of a subject line. */
export function extractReference(subject: string): string | null {
  const match = subject.toUpperCase().match(/\b[A-Z]{2,5}-\d{2,7}\b/)
  return match ? match[0] : null
}

export async function pollDocsMailbox(
  carrierId: string
): Promise<{ connected: boolean; filed?: number; unmatched?: number }> {
  const creds = await getCredentials(carrierId, "mailbox")
  if (!creds?.user) return { connected: false }
  // Password (Gmail app password) or OAuth2 (M365 / Google Workspace XOAUTH2) —
  // resolveMailboxAuth picks from the saved fields and mints the token.
  const auth = await resolveMailboxAuth(creds)
  if (!auth) return { connected: false }
  const host = creds.host || defaultImapHost(auth.method)

  const { ImapFlow } = await import("imapflow")
  const { simpleParser } = await import("mailparser")
  const client = new ImapFlow({
    host,
    port: Number(creds.port ?? 993),
    secure: true,
    auth:
      auth.method === "password"
        ? { user: auth.user, pass: auth.pass }
        : { user: auth.user, accessToken: auth.accessToken },
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

  // The sync ledger row is the caller's job (cron route / syncIntegrationNowAction),
  // same as every other adapter — they record failures too, which an insert here
  // never could (a connect or token-mint throw skips straight past this line).
  return { connected: true, filed, unmatched }
}
