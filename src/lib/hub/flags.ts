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
import { query } from "./db"

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

/**
 * Server-side flag read. One query per evaluation — flags gate layout-level
 * choices resolved once per request in a layout, not per-component; if a
 * hot path ever needs one, add per-request memoization there, not here.
 */
export async function getFlag(key: FlagKey, ctx: FlagContext): Promise<boolean> {
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
}
