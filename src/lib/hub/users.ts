import { query, queryOne, hubDbAvailable } from "./db"
import type { HubRole, HubUser } from "./types"

export async function findHubUserByEmail(email: string): Promise<(HubUser & { password_hash: string }) | null> {
  if (!hubDbAvailable()) return null
  try {
    return await queryOne<HubUser & { password_hash: string }>(
      `SELECT id, email, password_hash, name, role, phone, customer_id, driver_id, active
       FROM hub.users WHERE LOWER(email) = LOWER($1) AND active = TRUE`,
      [email]
    )
  } catch {
    // Hub schema may not exist yet (e.g. fresh deploy) — never break site-wide auth.
    return null
  }
}

export async function listHubUsers(): Promise<HubUser[]> {
  return query<HubUser>(
    `SELECT id, email, name, role, phone, customer_id, driver_id, active
     FROM hub.users ORDER BY role, name`
  )
}

export async function createHubUser(user: {
  email: string
  passwordHash: string
  name: string
  role: HubRole
  phone?: string | null
}): Promise<HubUser> {
  const rows = await query<HubUser>(
    `INSERT INTO hub.users (email, password_hash, name, role, phone)
     VALUES (LOWER($1), $2, $3, $4, $5)
     RETURNING id, email, name, role, phone, customer_id, driver_id, active`,
    [user.email, user.passwordHash, user.name, user.role, user.phone ?? null]
  )
  return rows[0]
}

export async function setHubUserActive(id: string, active: boolean): Promise<void> {
  await query(`UPDATE hub.users SET active = $2, updated_at = NOW() WHERE id = $1`, [id, active])
}
