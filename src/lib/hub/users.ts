import { query, queryOne, hubDbAvailable } from "./db"
import type { HubRole, HubUser } from "./types"

export async function findHubUserByEmail(email: string): Promise<(HubUser & { password_hash: string }) | null> {
  if (!hubDbAvailable()) return null
  try {
    return await queryOne<HubUser & { password_hash: string }>(
      `SELECT u.id, u.email, u.password_hash, u.name, u.role, u.carrier_id, u.phone,
              u.customer_id, u.driver_id, u.active, u.data_mode,
              COALESCE(
                array_agg(uca.carrier_id::text) FILTER (WHERE uca.carrier_id IS NOT NULL),
                CASE WHEN u.carrier_id IS NULL THEN ARRAY[]::text[] ELSE ARRAY[u.carrier_id::text] END
              ) AS allowed_carrier_ids
       FROM hub.users u
       LEFT JOIN hub.user_carrier_access uca ON uca.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1) AND u.active = TRUE
       GROUP BY u.id`,
      [email]
    )
  } catch {
    // Hub schema may not exist yet (e.g. fresh deploy) — never break site-wide auth.
    return null
  }
}

export async function listHubUsers(carrierId: string): Promise<HubUser[]> {
  return query<HubUser>(
    `SELECT id, email, name, role, carrier_id, phone, customer_id, driver_id, active, data_mode
     FROM hub.users WHERE carrier_id = $1 ORDER BY role, name`,
    [carrierId]
  )
}

export async function createHubUser(carrierId: string, user: {
  email: string
  passwordHash: string
  name: string
  role: HubRole
  phone?: string | null
}): Promise<HubUser> {
  const rows = await query<HubUser>(
    `INSERT INTO hub.users (carrier_id, email, password_hash, name, role, phone)
     VALUES ($1, LOWER($2), $3, $4, $5, $6)
     RETURNING id, email, name, role, carrier_id, phone, customer_id, driver_id, active, data_mode`,
    [carrierId, user.email, user.passwordHash, user.name, user.role, user.phone ?? null]
  )
  return rows[0]
}

export async function setHubUserActive(carrierId: string, id: string, active: boolean): Promise<void> {
  await query(
    `UPDATE hub.users SET active = $3, updated_at = NOW() WHERE carrier_id = $1 AND id = $2`,
    [carrierId, id, active]
  )
}
