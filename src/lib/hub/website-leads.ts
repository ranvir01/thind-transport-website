/**
 * Website driver leads — the bridge between the recruitment site's capture
 * points and the hub, so a lead survives even when email is unconfigured.
 * Inserts are best-effort by design: the capture path must never show a
 * driver an error because our storage hiccuped (they still see success if
 * either DB or email worked).
 */
import { query, queryOne, hubDbAvailable } from "./db"

export interface WebsiteLead {
  id: string
  name: string | null
  email: string
  phone: string | null
  source: string | null
  driver_type: string | null
  experience_years: string | null
  message: string | null
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
}): Promise<boolean> {
  if (!hubDbAvailable()) return false
  try {
    await query(
      `INSERT INTO hub.website_leads (name, email, phone, source, driver_type, experience_years, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        lead.name ?? null,
        lead.email,
        lead.phone ?? null,
        lead.source ?? null,
        lead.driverType ?? null,
        lead.experienceYears ?? null,
        lead.message ?? null,
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

export async function listWebsiteLeads(limit = 100): Promise<WebsiteLead[]> {
  return query<WebsiteLead>(
    `SELECT id::text, name, email, phone, source, driver_type, experience_years, message,
            status, created_at::text, contacted_at::text
     FROM hub.website_leads
     ORDER BY (status = 'new') DESC, created_at DESC
     LIMIT $1`,
    [limit]
  )
}

export async function countNewWebsiteLeads(): Promise<number> {
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
  id: string,
  status: "new" | "contacted" | "closed"
): Promise<void> {
  await query(
    `UPDATE hub.website_leads
     SET status = $2, contacted_at = CASE WHEN $2 = 'contacted' THEN NOW() ELSE contacted_at END
     WHERE id = $1::bigint`,
    [id, status]
  )
}
