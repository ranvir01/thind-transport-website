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
import type { DocumentKind } from "./types"
import type { ParsedMail } from "mailparser"

/** Pull a load reference like THD-1042 / LD-23 out of a subject line. */
export function extractReference(subject: string): string | null {
  const match = subject.toUpperCase().match(/\b[A-Z]{2,5}-\d{2,7}\b/)
  return match ? match[0] : null
}

/**
 * Document kinds the mailbox can file an attachment as — a subset of the real
 * DocumentKind union, so the compiler rejects a kind saveDocument can't store.
 * (It already caught one: there is no "invoice" kind, and an inbound invoice
 * is not a load document anyway.)
 */
export type MailboxDocKind = Extract<DocumentKind, "rate_confirmation" | "pod" | "bol">


/**
 * What kind of document is this attachment?
 *
 * Everything arriving by mail used to be filed as a rate confirmation, which
 * quietly broke two things downstream: POD-gated invoicing never saw its POD,
 * and the factoring packet's document filter (which selects kind === "pod")
 * shipped an incomplete packet to the factor.
 *
 * Filename wins over subject — a single email often carries several documents
 * under one subject line, and the filename is the only per-attachment signal.
 * Rate confirmation stays the fallback because that is what the mailbox was
 * built for and what most inbound broker mail actually is.
 *
 * Pure and exported so the table of real-world subjects below can be tested
 * without an IMAP connection.
 */
export function classifyDocumentKind(
  filename: string | null | undefined,
  subject: string | null | undefined
): MailboxDocKind {
  const check = (text: string): MailboxDocKind | null => {
    // Underscores, hyphens and dots become spaces FIRST. `_` is a word
    // character to a JS regex, so `\bpod\b` does not match "POD_1042.pdf" —
    // which is exactly how most brokers name the file.
    const t = text.toLowerCase().replace(/[_\-.]+/g, " ")
    // Order matters: "signed BOL" is a POD, and a rate con that also mentions
    // a BOL is still primarily a rate con, so the POD and rate-con tests
    // bracket the plain BOL test.
    if (/\bpod\b|proof\s*of\s*delivery|delivery\s*receipt|signed\s*bol/.test(t)) return "pod"
    if (/rate\s*con(firmation)?\b|\bratecon\b|load\s*confirmation|carrier\s*confirmation/.test(t)) {
      return "rate_confirmation"
    }
    if (/\bbol\b|bill\s*of\s*lading/.test(t)) return "bol"
    return null
  }
  return check(filename ?? "") ?? check(subject ?? "") ?? "rate_confirmation"
}

/** Mail bodies are HTML as often as not; the parser wants prose, not markup. */
function mailBodyText(parsed: ParsedMail): string {
  if (parsed.text && parsed.text.trim()) return parsed.text.trim()
  if (typeof parsed.html === "string") {
    return parsed.html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }
  return ""
}

/**
 * Mail that matched no load: keep it as an Inbox draft instead of discarding it.
 *
 * Attachments are read first (a rate con is nearly always the PDF), and the
 * message body is the fallback for brokers who paste the confirmation inline.
 * Only rate cons are staged — the Inbox is a booking queue, so a stray POD for
 * an unknown reference still falls through to the file-it-by-hand notification
 * rather than becoming a load someone has to dismiss.
 *
 * An attachment we cannot read is still staged (confidence "unreadable") with
 * the file saved against the carrier, because losing it is the failure mode
 * this whole path exists to end.
 *
 * Returns how many drafts were created. Never throws: one malformed attachment
 * must not abort the poll and leave the rest of the mailbox unread.
 */
async function stageUnmatchedMail(carrierId: string, parsed: ParsedMail): Promise<number> {
  const { extractTextFromBuffer } = await import("./doc-intake/extract-text-server")
  const { classifyDocument } = await import("./doc-intake/classify")
  const { analyzeDocumentEnhanced } = await import("./doc-intake/analyze-enhanced")
  const { createIntakeDraft } = await import("./intake-drafts")
  const { overallConfidence } = await import("./rate-con-to-form")
  const { parseRateCon } = await import("./parser")

  const subject = parsed.subject ?? null
  const from = parsed.from?.text ?? null
  let created = 0

  const stage = async (text: string, warning: string | undefined, documentId: string | null) => {
    if (warning || !text) {
      await createIntakeDraft({
        carrierId, subject, fromAddress: from, rawText: text || null,
        parsed: parseRateCon(""), confidence: "unreadable", documentId,
      })
      created++
      return
    }
    const { analysis } = await analyzeDocumentEnhanced(text, subject ?? undefined)
    if (analysis.payload.kind !== "rate_con") return
    await createIntakeDraft({
      carrierId, subject, fromAddress: from, rawText: text,
      parsed: analysis.payload.data,
      confidence: overallConfidence(analysis.payload.data),
      documentId,
    })
    created++
  }

  for (const attachment of parsed.attachments ?? []) {
    if (!attachment.content || attachment.content.length === 0) continue
    if (attachment.content.length > 15 * 1024 * 1024) continue
    // Signature logos and inline images ride along on almost every broker
    // email. They are unreadable by definition, so without this they would each
    // become a draft someone has to dismiss — the Inbox would be unusable on
    // day one.
    if (attachment.related || attachment.contentDisposition === "inline") continue
    if ((attachment.contentType ?? "").startsWith("image/")) continue
    const filename = attachment.filename ?? `attachment-${Date.now()}.pdf`
    try {
      const bytes = new Uint8Array(attachment.content)
      // classifyDocumentKind first, and it can VETO. The generic
      // classifyDocument scores the bare word "delivery" as a rate con, so an
      // unmatched POD — routine inbound mail — would otherwise become a
      // booking draft someone has to dismiss. classifyDocumentKind is the
      // mail-specific classifier that already tells the two apart by filename.
      if (classifyDocumentKind(filename, parsed.subject) !== "rate_confirmation") continue
      const { text, warning } = await extractTextFromBuffer(bytes, filename, attachment.contentType)
      // Only pay for storage once we believe it is freight paperwork. An
      // unreadable attachment counts — we cannot tell, so we keep it.
      if (!warning && classifyDocument(text, filename) !== "rate_con") continue
      const doc = await saveDocument({
        carrierId,
        entityType: "carrier",
        entityId: carrierId,
        kind: "rate_confirmation",
        file: new File([bytes], filename, { type: attachment.contentType || "application/octet-stream" }),
      })
      await stage(text, warning, doc.id)
    } catch {
      // Storage or parse blew up on this one file; the rest of the mail — and
      // the rest of the mailbox — still get processed.
    }
  }

  if (created === 0) {
    const body = mailBodyText(parsed)
    if (
      body &&
      classifyDocumentKind(null, subject) === "rate_confirmation" &&
      classifyDocument(body, subject ?? undefined) === "rate_con"
    ) {
      try {
        await stage(body, undefined, null)
      } catch {
        /* body parse failed; the caller still notifies */
      }
    }
  }

  return created
}

export async function pollDocsMailbox(
  carrierId: string
): Promise<{ connected: boolean; filed?: number; unmatched?: number; drafted?: number }> {
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
  let drafted = 0
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
        const kindsFiled = new Set<MailboxDocKind>()
        if (load) {
          for (const attachment of parsed.attachments ?? []) {
            if (!attachment.content || attachment.content.length === 0) continue
            if (attachment.content.length > 15 * 1024 * 1024) continue
            const file = new File(
              [new Uint8Array(attachment.content)],
              attachment.filename ?? `attachment-${Date.now()}.pdf`,
              { type: attachment.contentType ?? "application/octet-stream" }
            )
            // Classified per attachment, not per email: one message routinely
            // carries a rate con and a POD under one subject line.
            const kind = classifyDocumentKind(attachment.filename, parsed.subject)
            kindsFiled.add(kind)
            await saveDocument({
              carrierId,
              entityType: "load",
              entityId: load.id,
              kind,
              file,
            })
            attachedHere++
          }
          if (attachedHere > 0) {
            await addLoadEvent(carrierId, load.id, "document", {
              kind: [...kindsFiled].sort().join(", "),
              via: "docs mailbox",
              from: parsed.from?.text ?? "unknown sender",
              files: attachedHere,
            }, { id: null, name: "Docs mailbox" })
            filed += attachedHere
          }
        }

        if (!load || attachedHere === 0) {
          // Nothing to file it onto — but the mail may be a rate con for
          // freight not booked yet, which this branch used to throw away.
          // Stage it in the Inbox instead; a human still books it.
          const staged = await stageUnmatchedMail(carrierId, parsed)
          unmatched++
          const { notifyRoles } = await import("./notify")
          drafted += staged
          await notifyRoles(carrierId, ["owner", "dispatcher"], {
            kind: "mailbox",
            title: staged
              ? `Inbox: ${staged} rate con${staged === 1 ? "" : "s"} waiting for review`
              : `Docs mailbox: couldn't file "${(parsed.subject ?? "no subject").slice(0, 60)}"`,
            body: staged
              ? `From ${parsed.from?.text ?? "unknown sender"} — open the Inbox to review and book.`
              : reference
                ? `No load matches ${reference} — file it by hand.`
                : "No load reference in the subject — file it by hand.",
            link: staged ? "/hub/inbox" : "/hub/settings/integrations",
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
  return { connected: true, filed, unmatched, drafted }
}
