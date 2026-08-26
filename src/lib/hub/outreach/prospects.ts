/**
 * Outreach prospects data layer — carrier-scoped CRUD over
 * hub.outreach_prospects. Every function takes carrierId and filters on it;
 * nothing here is reachable without an office session (see _actions/outreach).
 */
import { query, queryOne, hubDbAvailable } from "../db"
import type { Audience, Channel, ProspectInput } from "./draft"

export type ProspectStatus =
  | "new" | "drafted" | "approved" | "sent" | "replied" | "converted" | "unsubscribed" | "bounced"

export interface Prospect {
  id: string
  audience: Audience
  company: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  mc_number: string | null
  lane: string | null
  equipment: string | null
  notes: string | null
  source: string | null
  status: ProspectStatus
  draft_channel: Channel | null
  draft_subject: string | null
  draft_body: string | null
  last_contacted_at: string | null
  created_at: string
}

const COLS = `id::text, audience, company, contact_name, email, phone, mc_number, lane, equipment,
  notes, source, status, draft_channel, draft_subject, draft_body,
  last_contacted_at::text, created_at::text`

export async function listProspects(
  carrierId: string,
  opts: { audience?: Audience; status?: ProspectStatus; limit?: number } = {}
): Promise<Prospect[]> {
  const where: string[] = ["carrier_id = $1"]
  const params: unknown[] = [carrierId]
  if (opts.audience) { params.push(opts.audience); where.push(`audience = $${params.length}`) }
  if (opts.status) { params.push(opts.status); where.push(`status = $${params.length}`) }
  params.push(opts.limit ?? 200)
  return query<Prospect>(
    `SELECT ${COLS} FROM hub.outreach_prospects
     WHERE ${where.join(" AND ")}
     ORDER BY (status = 'replied') DESC, (status = 'new') DESC, created_at DESC
     LIMIT $${params.length}`,
    params
  )
}

export interface StatusCounts {
  total: number
  new: number
  drafted: number
  approved: number
  sent: number
  replied: number
  converted: number
  suppressed: number
}

export async function countByStatus(carrierId: string): Promise<StatusCounts> {
  const empty: StatusCounts = { total: 0, new: 0, drafted: 0, approved: 0, sent: 0, replied: 0, converted: 0, suppressed: 0 }
  try {
    const rows = await query<{ status: ProspectStatus; n: string }>(
      `SELECT status, COUNT(*)::text AS n FROM hub.outreach_prospects
       WHERE carrier_id = $1 GROUP BY status`,
      [carrierId]
    )
    const out = { ...empty }
    for (const r of rows) {
      const n = Number(r.n)
      out.total += n
      if (r.status === "unsubscribed" || r.status === "bounced") out.suppressed += n
      else (out as unknown as Record<string, number>)[r.status] += n
    }
    return out
  } catch {
    return empty // pre-migration DB
  }
}

export async function getProspect(carrierId: string, id: string): Promise<Prospect | null> {
  return queryOne<Prospect>(
    `SELECT ${COLS} FROM hub.outreach_prospects WHERE carrier_id = $1 AND id = $2::bigint`,
    [carrierId, id]
  )
}

/**
 * Upsert imported rows on (carrier_id, lower(email)). Returns how many were
 * inserted vs. updated vs. skipped (no email AND no phone/company). Re-importing
 * the same list is safe — existing rows get enriched, not duplicated.
 */
export async function importProspects(
  carrierId: string,
  rows: ProspectInput[],
  source: string
): Promise<{ inserted: number; updated: number; skipped: number }> {
  if (!hubDbAvailable()) return { inserted: 0, updated: 0, skipped: rows.length }
  let inserted = 0, updated = 0, skipped = 0
  for (const r of rows) {
    if (!r.email && !r.phone && !r.company) { skipped++; continue }
    if (r.email) {
      const res = await query<{ inserted: boolean }>(
        `INSERT INTO hub.outreach_prospects
           (carrier_id, audience, company, contact_name, email, phone, mc_number, lane, equipment, notes, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (carrier_id, lower(email)) WHERE email IS NOT NULL AND email <> ''
         DO UPDATE SET
           company = COALESCE(EXCLUDED.company, hub.outreach_prospects.company),
           contact_name = COALESCE(EXCLUDED.contact_name, hub.outreach_prospects.contact_name),
           phone = COALESCE(EXCLUDED.phone, hub.outreach_prospects.phone),
           mc_number = COALESCE(EXCLUDED.mc_number, hub.outreach_prospects.mc_number),
           lane = COALESCE(EXCLUDED.lane, hub.outreach_prospects.lane),
           equipment = COALESCE(EXCLUDED.equipment, hub.outreach_prospects.equipment),
           updated_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [carrierId, r.audience, r.company, r.contactName, r.email, r.phone, r.mcNumber, r.lane, r.equipment, r.notes, source]
      )
      if (res[0]?.inserted) inserted++; else updated++
    } else {
      await query(
        `INSERT INTO hub.outreach_prospects
           (carrier_id, audience, company, contact_name, email, phone, mc_number, lane, equipment, notes, source)
         VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$10)`,
        [carrierId, r.audience, r.company, r.contactName, r.phone, r.mcNumber, r.lane, r.equipment, r.notes, source]
      )
      inserted++
    }
  }
  return { inserted, updated, skipped }
}

export async function saveDraft(
  carrierId: string,
  id: string,
  draft: { channel: Channel; subject: string; body: string }
): Promise<void> {
  await query(
    `UPDATE hub.outreach_prospects
     SET draft_channel = $3, draft_subject = $4, draft_body = $5,
         status = CASE WHEN status IN ('new','drafted','approved') THEN 'drafted' ELSE status END,
         updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2::bigint`,
    [carrierId, id, draft.channel, draft.subject, draft.body]
  )
}

/** Generic status transition (approved/replied/converted/unsubscribed/bounced). */
export async function setStatus(carrierId: string, id: string, status: ProspectStatus): Promise<void> {
  await query(
    `UPDATE hub.outreach_prospects SET status = $3, updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2::bigint`,
    [carrierId, id, status]
  )
}

export async function markSent(carrierId: string, id: string): Promise<void> {
  await query(
    `UPDATE hub.outreach_prospects
     SET status = 'sent', last_contacted_at = NOW(), updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2::bigint`,
    [carrierId, id]
  )
}

/** Opt-out: never contact this email again for this carrier. */
export async function suppressByEmail(carrierId: string, email: string): Promise<void> {
  await query(
    `UPDATE hub.outreach_prospects SET status = 'unsubscribed', updated_at = NOW()
     WHERE carrier_id = $1 AND lower(email) = lower($2)`,
    [carrierId, email]
  )
}
