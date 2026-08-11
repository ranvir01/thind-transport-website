/**
 * Feature flags — definitions in code, overrides in Postgres.
 *
 * The 2026-08 customization research surveyed flag servers (Unleash,
 * Flagsmith, GrowthBook, paid SaaS) and landed where the house pattern
 * already points: for one app + one database + one operator, a flag SERVER
 * is pure operational overhead. Definitions live here as a typed registry
 * (the navigation.ts/workbench.ts pattern); hub.feature_flags stores only
 * overrides, so an empty table means code defaults everywhere.
 *
 * Resolution, most specific wins:
 *   user > carrier+role > role(all tenants) > carrier > global > code default
 * Disabled and expired rows are skipped. Evaluation is server-side only.
 *
 * Discipline (from the same research, the parts with scars attached):
 *  - 'release'/'experiment' flags MUST carry expiries — flags are inventory
 *    with carrying cost, and Knight Capital's $460M was a REUSED stale flag.
 *  - Never reuse a retired key. Delete the flag and its dead code together.
 *  - Labels, not logic: flags gate/configure; they never encode workflows.
 *
 * The first real flag fixes a real multi-tenant bug: small-carrier mode was
 * a GLOBAL env var trimming every tenant's nav at once — carrier #2 could
 * never see the full surface while Thind ran trimmed.
 */
import { query, queryOne } from "./db"

export type FlagKey = keyof typeof FLAG_REGISTRY

export interface FlagDefinition {
  /** What this flag does, for the settings UI and the weekly digest. */
  description: string
  type: "release" | "ops" | "permission" | "experiment"
  /** Code default when no override row matches. */
  defaultValue: boolean
}

export const FLAG_REGISTRY = {
  /**
   * Trim nav + ⌘K to what a small fleet runs (planner, capacity, recruiting,
   * facilities etc. stay URL-reachable). Default comes from the legacy
   * SMALL_CARRIER_MODE env var so existing deploys behave identically until
   * a per-carrier row says otherwise.
   */
  "nav.small_carrier_mode": {
    description: "Trim navigation to the small-fleet surface",
    type: "permission",
    defaultValue: process.env.SMALL_CARRIER_MODE !== "false",
  },
  /**
   * Shift Mode: the sandbox's real-time simulation (SimTicker heartbeat,
   * /api/hub/sandbox/tick, ShiftCard clock-in). HUB_DEMO_LOGIN=false stays
   * the hard kill for the whole sandbox; this is the soft kill that needs
   * no redeploy — flag off ⇒ tick 403s, ticker and shift card unmount, the
   * seeded world simply stands still.
   */
  "sim.shift_mode": {
    description: "Run the sandbox's real-time simulation (Shift Mode)",
    type: "ops",
    defaultValue: true,
  },
} as const satisfies Record<string, FlagDefinition>

export interface FlagContext {
  carrierId?: string | null
  userId?: string | null
  role?: string | null
}

interface FlagRow {
  scope: "global" | "carrier" | "role" | "user"
  carrier_id: string | null
  role: string | null
  user_id: string | null
  value: unknown
}

/** Specificity order for resolution — index 0 wins. */
const SPECIFICITY: ((row: FlagRow, ctx: FlagContext) => boolean)[] = [
  (r, c) => r.scope === "user" && r.user_id === c.userId,
  (r, c) => r.scope === "role" && r.role === c.role && r.carrier_id === c.carrierId,
  (r, c) => r.scope === "role" && r.role === c.role && r.carrier_id === null,
  (r, c) => r.scope === "carrier" && r.carrier_id === c.carrierId,
  (r) => r.scope === "global",
]

/** Pure resolution over already-fetched rows — the testable core. */
export function resolveFlagValue(key: FlagKey, rows: FlagRow[], ctx: FlagContext): boolean {
  for (const matches of SPECIFICITY) {
    const row = rows.find((r) => matches(r, ctx))
    if (row) return row.value === true
  }
  return FLAG_REGISTRY[key].defaultValue
}

const readFailureWarned = new Set<string>()

/**
 * Server-side flag read. One query per evaluation — flags gate layout-level
 * choices resolved once per request in a layout, not per-component; if a
 * hot path ever needs one, add per-request memoization there, not here.
 *
 * Flags must never take the shell down: getFlag is called from the office
 * layout on every request, so a read error (table not yet migrated on this
 * database, transient outage) degrades to the code default — which is
 * defined to reproduce pre-flags behavior exactly — instead of throwing
 * a 500 across every office screen at once.
 */
/**
 * The carrier-scope override row for a flag, or null when none exists and
 * the code default governs. Read by the settings UI so it can show "explicit
 * choice" vs "following the default" honestly.
 */
export async function getCarrierFlagOverride(key: FlagKey, carrierId: string): Promise<boolean | null> {
  const row = await queryOne<{ value: unknown }>(
    `SELECT value FROM hub.feature_flags
     WHERE flag_key = $1 AND scope = 'carrier' AND carrier_id = $2 AND enabled = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [key, carrierId]
  )
  return row ? row.value === true : null
}

/**
 * Write path: one carrier-scope override per (flag, carrier). Passing null
 * DELETES the override rather than writing enabled = FALSE — "an empty table
 * means code defaults everywhere" stays literally true, and a cleared choice
 * can't shadow a future global row.
 */
export async function setCarrierFlag(
  key: FlagKey,
  carrierId: string,
  value: boolean | null,
  actor?: { id: string }
): Promise<void> {
  if (value === null) {
    await query(
      `DELETE FROM hub.feature_flags WHERE flag_key = $1 AND scope = 'carrier' AND carrier_id = $2`,
      [key, carrierId]
    )
    return
  }
  await query(
    `INSERT INTO hub.feature_flags (flag_key, flag_type, scope, carrier_id, value, created_by)
     VALUES ($1, $2, 'carrier', $3, to_jsonb($4::boolean), $5)
     ON CONFLICT (flag_key, scope, carrier_id, role, user_id)
     DO UPDATE SET value = EXCLUDED.value, enabled = TRUE, expires_at = NULL, updated_at = NOW()`,
    [key, FLAG_REGISTRY[key].type, carrierId, value, actor?.id ?? null]
  )
}

export async function getFlag(key: FlagKey, ctx: FlagContext): Promise<boolean> {
  try {
    const rows = await query<FlagRow>(
      `SELECT scope, carrier_id, role, user_id, value
       FROM hub.feature_flags
       WHERE flag_key = $1 AND enabled = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (
           scope = 'global'
           OR (scope = 'carrier' AND carrier_id = $2)
           OR (scope = 'role' AND role = $3 AND (carrier_id = $2 OR carrier_id IS NULL))
           OR (scope = 'user' AND user_id = $4)
         )`,
      [key, ctx.carrierId ?? null, ctx.role ?? null, ctx.userId ?? null]
    )
    return resolveFlagValue(key, rows, ctx)
  } catch (err) {
    if (!readFailureWarned.has(key)) {
      readFailureWarned.add(key)
      console.warn(`flags: read failed for "${key}" — serving the code default.`, err)
    }
    return resolveFlagValue(key, [], ctx)
  }
}
