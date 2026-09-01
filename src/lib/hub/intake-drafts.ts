/**
 * Staged inbound rate cons — the Inbox queue.
 *
 * Every query here is carrier-scoped in its WHERE clause (never filtered in
 * JS), including the ones addressed by primary key: a draft id is a UUID a
 * caller supplies, so `WHERE id = $1` alone would let one carrier resolve
 * another's mail. See __tests__/intake-drafts-tenancy.test.ts.
 *
 * Nothing in this module creates a load. A draft is a proposal; accepting it is
 * a separate, permission-checked action in app/hub/_actions/intake.ts.
 */
import { query, queryOne } from "./db"
import type { ParsedRateCon } from "./parser"

export type IntakeDraftStatus = "pending" | "accepted" | "dismissed"
export type IntakeDraftSource = "mailbox" | "upload"
/** "unreadable" = the attachment carried no extractable text (scanned PDF). */
export type IntakeConfidence = "high" | "medium" | "low" | "unreadable"

export interface IntakeDraft {
  id: string
  carrier_id: string
  source: IntakeDraftSource
  subject: string | null
  from_address: string | null
  raw_text: string | null
  parsed: ParsedRateCon
  confidence: IntakeConfidence
  document_id: string | null
  status: IntakeDraftStatus
  created_load_id: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  /** Joined from hub.documents so the queue can link straight to the PDF. */
  document_url?: string | null
  document_name?: string | null
}

const DRAFT_COLUMNS = `id, carrier_id, source, subject, from_address, raw_text, parsed,
  confidence, document_id, status, created_load_id, created_at, resolved_at, resolved_by`

/**
 * Same columns, prefixed, plus the attachment's URL. The join carries its own
 * `d.carrier_id = i.carrier_id` even though document_id is already a
 * carrier-scoped FK: join-side guards are the house rule precisely because a
 * missing one is invisible until it leaks.
 */
const DRAFT_SELECT_WITH_DOC = `SELECT ${DRAFT_COLUMNS.split(",").map((c) => `i.${c.trim()}`).join(", ")},
         d.url AS document_url, d.file_name AS document_name
    FROM hub.intake_drafts i
    LEFT JOIN hub.documents d ON d.id = i.document_id AND d.carrier_id = i.carrier_id`

export async function createIntakeDraft(input: {
  carrierId: string
  source?: IntakeDraftSource
  subject?: string | null
  fromAddress?: string | null
  rawText?: string | null
  parsed: ParsedRateCon
  confidence: IntakeConfidence
  documentId?: string | null
}): Promise<IntakeDraft> {
  const rows = await query<IntakeDraft>(
    `INSERT INTO hub.intake_drafts
       (carrier_id, source, subject, from_address, raw_text, parsed, confidence, document_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING ${DRAFT_COLUMNS}`,
    [
      input.carrierId,
      input.source ?? "mailbox",
      input.subject ?? null,
      input.fromAddress ?? null,
      // Raw text is the broker's document verbatim. Kept so a bad parse can be
      // re-read by a human without re-opening the PDF; trimmed to keep one
      // oversized attachment from bloating the row.
      input.rawText ? input.rawText.slice(0, 40000) : null,
      JSON.stringify(input.parsed ?? {}),
      input.confidence,
      input.documentId ?? null,
    ]
  )
  return rows[0]
}

export async function listIntakeDrafts(
  carrierId: string,
  status: IntakeDraftStatus = "pending",
  limit = 50
): Promise<IntakeDraft[]> {
  return query<IntakeDraft>(
    `${DRAFT_SELECT_WITH_DOC}
     WHERE i.carrier_id = $1 AND i.status = $2
     ORDER BY i.created_at DESC
     LIMIT $3`,
    [carrierId, status, limit]
  )
}

/** Badge count for the nav. Cheap enough to run on every office page render. */
export async function pendingIntakeCount(carrierId: string): Promise<number> {
  const row = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM hub.intake_drafts
     WHERE carrier_id = $1 AND status = 'pending'`,
    [carrierId]
  )
  return Number(row?.n ?? 0)
}

export async function getIntakeDraft(carrierId: string, id: string): Promise<IntakeDraft | null> {
  return queryOne<IntakeDraft>(
    `${DRAFT_SELECT_WITH_DOC}
     WHERE i.carrier_id = $1 AND i.id = $2`,
    [carrierId, id]
  )
}

/**
 * Resolve a draft. Returns false when nothing was updated — a wrong carrier, an
 * unknown id, or a draft someone else already handled (the `status = 'pending'`
 * guard makes double-accept from two open tabs a no-op rather than a second
 * load).
 */
export async function resolveIntakeDraft(input: {
  carrierId: string
  id: string
  status: Extract<IntakeDraftStatus, "accepted" | "dismissed">
  createdLoadId?: string | null
  resolvedBy?: string | null
}): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE hub.intake_drafts
        SET status = $3, created_load_id = $4, resolved_at = NOW(), resolved_by = $5
      WHERE carrier_id = $1 AND id = $2 AND status = 'pending'
      RETURNING id`,
    [input.carrierId, input.id, input.status, input.createdLoadId ?? null, input.resolvedBy ?? null]
  )
  return rows.length > 0
}
