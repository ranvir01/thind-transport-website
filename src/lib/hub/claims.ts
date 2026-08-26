/**
 * Cargo/property/injury claims: the office side of the claim rows the driver
 * OS&D flow auto-opens (and anyone can open by hand). Carmack gives a cargo
 * claim 9 months from delivery to be filed — hub.claims carries the deadline,
 * the daily task cron nags inside 30 days, and this module is the lifecycle
 * (open → filed → settled/denied/closed) those nags finally link to.
 */
import { query, queryOne } from "./db"
import { assertCarrierRefs } from "./tenancy"

export type ClaimKind = "cargo" | "property" | "injury"
export type ClaimStatus = "open" | "filed" | "settled" | "denied" | "closed"

export interface Claim {
  id: string
  carrier_id: string
  incident_id: string | null
  load_id: string | null
  kind: ClaimKind
  status: ClaimStatus
  amount_cents: number | null
  filing_deadline: string | null
  notes: string | null
  created_at: string
  updated_at: string
  load_reference?: string | null
  incident_occurred_at?: string | null
  incident_location?: string | null
}

const CLAIM_SELECT = `
  SELECT c.*,
    l.reference AS load_reference,
    i.occurred_at AS incident_occurred_at,
    i.location AS incident_location
  FROM hub.claims c
  LEFT JOIN hub.loads l ON l.id = c.load_id AND l.carrier_id = c.carrier_id
  LEFT JOIN hub.incidents i ON i.id = c.incident_id AND i.carrier_id = c.carrier_id`

export async function listClaims(
  carrierId: string,
  filters: { status?: ClaimStatus; openOnly?: boolean; limit?: number } = {}
): Promise<Claim[]> {
  const params: unknown[] = [carrierId]
  let where = `c.carrier_id = $1`
  if (filters.status) {
    params.push(filters.status)
    where += ` AND c.status = $${params.length}`
  } else if (filters.openOnly) {
    where += ` AND c.status IN ('open','filed')`
  }
  return query<Claim>(
    `${CLAIM_SELECT} WHERE ${where}
     ORDER BY (c.status IN ('open','filed')) DESC, c.filing_deadline ASC NULLS LAST, c.created_at DESC
     LIMIT ${Math.min(filters.limit ?? 200, 1000)}`,
    params
  )
}

export async function getClaim(carrierId: string, id: string): Promise<Claim | null> {
  return queryOne<Claim>(`${CLAIM_SELECT} WHERE c.carrier_id = $1 AND c.id = $2`, [carrierId, id])
}

export interface ClaimInput {
  kind: ClaimKind
  status?: ClaimStatus
  loadId?: string | null
  incidentId?: string | null
  amountCents?: number | null
  filingDeadline?: string | null
  notes?: string | null
}

export async function createClaim(carrierId: string, input: ClaimInput): Promise<Claim> {
  await assertCarrierRefs(carrierId, { load_id: input.loadId, incident_id: input.incidentId })
  const rows = await query<Claim>(
    `INSERT INTO hub.claims (carrier_id, incident_id, load_id, kind, status, amount_cents, filing_deadline, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      carrierId, input.incidentId ?? null, input.loadId ?? null, input.kind,
      input.status ?? "open", input.amountCents ?? null, input.filingDeadline ?? null,
      input.notes ?? null,
    ]
  )
  return rows[0]
}

export async function updateClaim(
  carrierId: string,
  id: string,
  patch: Partial<ClaimInput>
): Promise<Claim | null> {
  const current = await getClaim(carrierId, id)
  if (!current) return null
  const loadId = patch.loadId !== undefined ? patch.loadId : current.load_id
  const incidentId = patch.incidentId !== undefined ? patch.incidentId : current.incident_id
  await assertCarrierRefs(carrierId, { load_id: loadId, incident_id: incidentId })
  const rows = await query<Claim>(
    `UPDATE hub.claims SET
       incident_id = $3, load_id = $4, kind = $5, status = $6, amount_cents = $7,
       filing_deadline = $8, notes = $9, updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2 RETURNING *`,
    [
      carrierId, id,
      incidentId,
      loadId,
      patch.kind ?? current.kind,
      patch.status ?? current.status,
      patch.amountCents !== undefined ? patch.amountCents : current.amount_cents,
      patch.filingDeadline !== undefined ? patch.filingDeadline : current.filing_deadline,
      patch.notes !== undefined ? patch.notes : current.notes,
    ]
  )
  return rows[0] ?? null
}

/**
 * The load detail page flags osd_flagged loads with a link straight to the
 * claim the driver OS&D flow auto-opened — before this, a flagged load gave
 * no hint that real money (a cargo claim) was sitting in a table nobody
 * could reach from there. Falls back to the newest claim on the load if
 * none is still open (settled/denied/closed claims still deserve a link).
 */
export async function getOsdClaimForLoad(
  carrierId: string,
  loadId: string
): Promise<{ osdFlagged: boolean; claim: Claim | null }> {
  const loadRow = await queryOne<{ osd_flagged: boolean }>(
    `SELECT osd_flagged FROM hub.loads WHERE carrier_id = $1 AND id = $2`,
    [carrierId, loadId]
  )
  if (!loadRow?.osd_flagged) return { osdFlagged: false, claim: null }
  const claim = await queryOne<Claim>(
    `${CLAIM_SELECT} WHERE c.carrier_id = $1 AND c.load_id = $2
     ORDER BY (c.status IN ('open','filed')) DESC, c.created_at DESC LIMIT 1`,
    [carrierId, loadId]
  )
  return { osdFlagged: true, claim }
}

/** Days until the filing deadline (negative = past due); null when no deadline. */
export function daysToDeadline(
  filingDeadline: string | Date | null,
  today = new Date()
): number | null {
  if (!filingDeadline) return null
  // pg hands DATE columns back as local-midnight Date objects; ISO strings come
  // from forms. Normalize both to a local calendar day before diffing.
  const raw =
    filingDeadline instanceof Date
      ? filingDeadline
      : new Date(`${String(filingDeadline).slice(0, 10)}T00:00:00`)
  const deadline = new Date(raw.getFullYear(), raw.getMonth(), raw.getDate())
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((deadline.getTime() - start.getTime()) / 86_400_000)
}
