/**
 * Website driver leads — the bridge between the recruitment site's capture
 * points and the hub, so a lead survives even when email is unconfigured.
 * Inserts are best-effort by design: the capture path must never show a
 * driver an error because our storage hiccuped (they still see success if
 * either DB or email worked).
 */
import { query, queryOne } from "./db"
import { hubDbAvailable } from "./db-available"
import type { Attribution } from "@/lib/attribution"

/**
 * hub.website_leads carries no carrier_id — it is the site operator's own
 * table, fed by thindtransport.com's public capture forms (migration 002's
 * well-known carrier row). Every hub-side read/write below takes the caller's
 * carrierId and refuses any other tenant, so the operator-only invariant
 * lives here at the data layer instead of in each caller's memory.
 */
export const OPERATOR_CARRIER_ID = "11111111-1111-1111-1111-111111111111"

export interface WebsiteLead {
  id: string
  name: string | null
  email: string
  phone: string | null
  source: string | null
  driver_type: string | null
  experience_years: string | null
  message: string | null
  /** Campaign / referrer / landing path for the visit this lead came from. */
  attribution: Attribution | null
  status: "new" | "contacted" | "closed"
  created_at: string
  contacted_at: string | null
}

export async function saveWebsiteLead(lead: {
  name?: string | null
  email: string
  phone?: string | null
  source?: string | null
  driverType?: string | null
  experienceYears?: string | null
  message?: string | null
  /** Campaign / referrer / landing path for this visit. */
  attribution?: Attribution | null
}): Promise<boolean> {
  if (!hubDbAvailable()) return false
  try {
    await query(
      `INSERT INTO hub.website_leads
         (name, email, phone, source, driver_type, experience_years, message, attribution)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        lead.name ?? null,
        lead.email,
        lead.phone ?? null,
        lead.source ?? null,
        lead.driverType ?? null,
        lead.experienceYears ?? null,
        lead.message ?? null,
        lead.attribution ? JSON.stringify(lead.attribution) : null,
      ]
    )
    return true
  } catch (err) {
    // Table missing (migration not yet applied) or DB down — the email path
    // and the caller's fallback message still stand between us and a lost lead.
    console.error("saveWebsiteLead failed:", err instanceof Error ? err.message : err)
    return false
  }
}

export async function listWebsiteLeads(carrierId: string, limit = 100): Promise<WebsiteLead[]> {
  if (carrierId !== OPERATOR_CARRIER_ID) return []
  return query<WebsiteLead>(
    `SELECT id::text, name, email, phone, source, driver_type, experience_years, message,
            attribution, status, created_at::text, contacted_at::text
     FROM hub.website_leads
     ORDER BY (status = 'new') DESC, created_at DESC
     LIMIT $1`,
    [limit]
  )
}

export async function getWebsiteLead(carrierId: string, id: string): Promise<WebsiteLead | null> {
  if (carrierId !== OPERATOR_CARRIER_ID) return null
  return queryOne<WebsiteLead>(
    `SELECT id::text, name, email, phone, source, driver_type, experience_years, message,
            attribution, status, created_at::text, contacted_at::text
     FROM hub.website_leads
     WHERE id = $1::bigint`,
    [id]
  )
}

export async function countNewWebsiteLeads(carrierId: string): Promise<number> {
  if (carrierId !== OPERATOR_CARRIER_ID) return 0
  try {
    const row = await queryOne<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM hub.website_leads WHERE status = 'new'`
    )
    return Number(row?.n ?? 0)
  } catch {
    // Pre-migration DB — the Today card simply doesn't render.
    return 0
  }
}

export async function setWebsiteLeadStatus(
  carrierId: string,
  id: string,
  status: "new" | "contacted" | "closed"
): Promise<void> {
  if (carrierId !== OPERATOR_CARRIER_ID) {
    throw new Error("Website leads belong to the site operator")
  }
  await query(
    `UPDATE hub.website_leads
     SET status = $2, contacted_at = CASE WHEN $2 = 'contacted' THEN NOW() ELSE contacted_at END
     WHERE id = $1::bigint`,
    [id, status]
  )
}
