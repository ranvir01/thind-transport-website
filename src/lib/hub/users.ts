import { query, queryOne } from "./db"
import { hubDbAvailable } from "./db-available"
import type { HubRole, HubUser } from "./types"

type HubUserRow = HubUser & { password_hash: string }

/**
 * Login lookup. The SELECT must stay a single-table read of hub.users —
 * a JOIN/GROUP BY on hub.user_carrier_access (the two-company switcher)
 * threw on some schemas, the catch below swallowed it, and authorize()
 * returned null. Every hub e2e smoke then sat on /hub/login until
 * waitForNavigation timed out (CredentialsSignin in the server log).
 *
 * Carrier-access rows are attached in a second, best-effort query so a
 * missing switcher table cannot take down sign-in.
 */
export async function findHubUserByEmail(email: string): Promise<HubUserRow | null> {
  if (!hubDbAvailable()) return null
  try {
    const user = await queryOne<HubUserRow>(
      `SELECT id, email, password_hash, name, role, carrier_id, phone, customer_id, driver_id, active
       FROM hub.users WHERE LOWER(email) = LOWER($1) AND active = TRUE`,
      [email]
    )
    if (!user) return null

    let dataMode: "production" | "sandbox" = "production"
    try {
      const extras = await queryOne<{ data_mode: "production" | "sandbox" | null }>(
        `SELECT data_mode FROM hub.users WHERE id = $1`,
        [user.id]
      )
      if (extras?.data_mode === "sandbox" || extras?.data_mode === "production") {
        dataMode = extras.data_mode
      }
    } catch {
      /* data_mode ships with the sandbox migration; older DBs still log in */
    }

    let allowed = user.carrier_id ? [user.carrier_id] : []
    try {
      const access = await query<{ carrier_id: string }>(
        `SELECT carrier_id::text AS carrier_id FROM hub.user_carrier_access WHERE user_id = $1`,
        [user.id]
      )
      if (access.length) allowed = access.map((row) => row.carrier_id)
    } catch {
      /* switcher table is optional — default tenant is enough to sign in */
    }

    return { ...user, allowed_carrier_ids: allowed, data_mode: dataMode }
  } catch (err) {
    // Hub schema may not exist yet (e.g. fresh deploy) — never break site-wide auth.
    console.error("findHubUserByEmail failed:", err instanceof Error ? err.message : "unknown")
    return null
  }
}

export async function listHubUsers(carrierId: string): Promise<HubUser[]> {
  return query<HubUser>(
    `SELECT id, email, name, role, carrier_id, phone, customer_id, driver_id, active
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
     RETURNING id, email, name, role, carrier_id, phone, customer_id, driver_id, active`,
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
