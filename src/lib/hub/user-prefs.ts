/**
 * Per-user UI preferences over hub.user_preferences (migration 026 — the
 * table shipped with the feature-flag work and had no reader until now).
 *
 * Scoped by BOTH carrier and user in every WHERE. user_id is already the
 * primary key, so the carrier guard is belt-and-braces — but a user id arrives
 * from a session and the carrier guard is what keeps a stale or spoofed session
 * from reading another tenant's row. House rule, tested in
 * __tests__/user-prefs-tenancy.test.ts.
 *
 * Preferences are a flat JSON object; keys are declared here so a typo in a
 * caller is a compile error, not a silently ignored setting.
 */
import { query, queryOne } from "./db"

export interface UserPrefs {
  /** Office sidebar collapsed to the 56px icon rail. */
  sidebarCollapsed?: boolean
}

export type UserPrefKey = keyof UserPrefs

const EMPTY: UserPrefs = {}

export async function getUserPrefs(carrierId: string, userId: string): Promise<UserPrefs> {
  const row = await queryOne<{ prefs: UserPrefs | null }>(
    `SELECT prefs FROM hub.user_preferences
     WHERE carrier_id = $1 AND user_id = $2`,
    [carrierId, userId]
  )
  return row?.prefs ?? EMPTY
}

/**
 * Merge one key into the row (JSONB `||`), creating the row on first write.
 * The ON CONFLICT arm carries its own carrier guard: a conflicting user_id row
 * belonging to another carrier is left untouched, and the write reports false.
 */
export async function setUserPref<K extends UserPrefKey>(
  carrierId: string,
  userId: string,
  key: K,
  value: UserPrefs[K]
): Promise<boolean> {
  const patch = JSON.stringify({ [key]: value })
  const rows = await query<{ user_id: string }>(
    `INSERT INTO hub.user_preferences (user_id, carrier_id, prefs)
     VALUES ($2, $1, $3::jsonb)
     ON CONFLICT (user_id) DO UPDATE
       SET prefs = hub.user_preferences.prefs || EXCLUDED.prefs, updated_at = NOW()
       WHERE hub.user_preferences.carrier_id = $1
     RETURNING user_id`,
    [carrierId, userId, patch]
  )
  return rows.length > 0
}
