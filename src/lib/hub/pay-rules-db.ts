/**
 * DB side of the pay-rules seam: each driver has one active rule set in
 * hub.pay_rules. The simple pay fields on the driver form (pay type, rate,
 * escrow, insurance) keep maintaining the auto-generated default rule set;
 * a custom rule set (different name) takes precedence and is never clobbered.
 */
import { query, queryOne } from "./db"
import { legacyConfigToRuleSet, parseRuleSet, type PayRuleSet } from "./pay-rules"

const AUTO_NAMES = ["Company per-mile", "Owner-operator percentage"]

export interface DriverPayConfig {
  payType: "per_mile" | "percentage"
  payRate: number
  payLoadedMilesOnly: boolean
  escrowWeeklyCents: number
  insuranceWeeklyCents: number
}

/** Keep the auto default rule set in lockstep with the simple driver pay fields. */
export async function syncDefaultPayRules(
  carrierId: string,
  driverId: string,
  config: DriverPayConfig
): Promise<void> {
  const custom = await queryOne<{ id: string }>(
    `SELECT id FROM hub.pay_rules
     WHERE carrier_id = $1 AND driver_id = $2 AND active AND NOT (name = ANY($3))
     LIMIT 1`,
    [carrierId, driverId, AUTO_NAMES]
  )
  if (custom) return // a hand-built program owns this driver's pay

  const ruleSet = legacyConfigToRuleSet(config)
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM hub.pay_rules
     WHERE carrier_id = $1 AND driver_id = $2 AND active AND name = ANY($3)
     ORDER BY updated_at DESC LIMIT 1`,
    [carrierId, driverId, AUTO_NAMES]
  )
  if (existing) {
    await query(
      `UPDATE hub.pay_rules SET name = $3, rules = $4, deductions = $5, updated_at = NOW() WHERE id = $1 AND carrier_id = $2`,
      [existing.id, carrierId, ruleSet.name, JSON.stringify(ruleSet.rules), JSON.stringify(ruleSet.deductions)]
    )
  } else {
    await query(
      `INSERT INTO hub.pay_rules (carrier_id, driver_id, name, rules, deductions)
       VALUES ($1, $2, $3, $4, $5)`,
      [carrierId, driverId, ruleSet.name, JSON.stringify(ruleSet.rules), JSON.stringify(ruleSet.deductions)]
    )
  }
}

export interface PayRuleRow extends PayRuleSet {
  id: string
  driver_id: string | null
  active: boolean
  isAuto: boolean
}

/** The rule set a driver settles under right now (custom beats auto). */
export async function getActivePayRules(
  carrierId: string,
  driverId: string
): Promise<PayRuleRow | null> {
  const row = await queryOne<{
    id: string; driver_id: string | null; name: string; active: boolean
    rules: unknown; deductions: unknown
  }>(
    `SELECT id, driver_id, name, active, rules, deductions FROM hub.pay_rules
     WHERE carrier_id = $1 AND driver_id = $2 AND active
     ORDER BY (name = ANY($3)) ASC, updated_at DESC LIMIT 1`,
    [carrierId, driverId, AUTO_NAMES]
  )
  if (!row) return null
  return {
    id: row.id,
    driver_id: row.driver_id,
    active: row.active,
    isAuto: AUTO_NAMES.includes(row.name),
    ...parseRuleSet(row),
  }
}

export interface DriverPayRuleSummary {
  driverId: string
  driverName: string
  payType: "per_mile" | "percentage"
  /** Null when the driver has no rule set at all (pre-migration-005 rows). */
  ruleSet: PayRuleSet | null
  /** True when the set is the one syncDefaultPayRules maintains from the driver form. */
  isAuto: boolean
  ruleId: string | null
}

/**
 * Every active driver with the rule set they settle under — one query for the
 * pay-rules screen rather than N calls to getActivePayRules.
 *
 * DISTINCT ON picks the same row getActivePayRules would: a custom set beats
 * the auto one, newest wins within a tier.
 */
export async function listDriverPayRules(carrierId: string): Promise<DriverPayRuleSummary[]> {
  const rows = await query<{
    driver_id: string; driver_name: string; pay_type: "per_mile" | "percentage"
    rule_id: string | null; name: string | null; rules: unknown; deductions: unknown
  }>(
    `SELECT d.id AS driver_id,
       d.first_name || ' ' || d.last_name AS driver_name,
       d.pay_type,
       p.id AS rule_id, p.name, p.rules, p.deductions
     FROM hub.drivers d
     LEFT JOIN LATERAL (
       SELECT r.id, r.name, r.rules, r.deductions
       FROM hub.pay_rules r
       WHERE r.carrier_id = d.carrier_id AND r.driver_id = d.id AND r.active
       ORDER BY (r.name = ANY($2)) ASC, r.updated_at DESC
       LIMIT 1
     ) p ON TRUE
     WHERE d.carrier_id = $1 AND d.deleted_at IS NULL AND d.status = 'active'
     ORDER BY d.first_name, d.last_name`,
    [carrierId, AUTO_NAMES]
  )
  return rows.map((row) => ({
    driverId: row.driver_id,
    driverName: row.driver_name,
    payType: row.pay_type,
    ruleId: row.rule_id,
    isAuto: row.name != null && AUTO_NAMES.includes(row.name),
    ruleSet:
      row.name == null
        ? null
        : parseRuleSet({ name: row.name, rules: row.rules, deductions: row.deductions }),
  }))
}

/**
 * Replace a driver's pay program with a hand-built one.
 *
 * Deactivates every existing set for the driver rather than updating in place,
 * so the old program stays on the row for audit and a settlement already
 * drafted against it is not retroactively re-explained. The name is forced off
 * the AUTO_NAMES list: sharing a name with the auto set would let
 * syncDefaultPayRules overwrite this the next time someone saves the driver
 * form — which is exactly the clobber that function exists to avoid.
 */
export async function savePayRuleSet(
  carrierId: string,
  driverId: string,
  ruleSet: PayRuleSet
): Promise<{ id: string }> {
  const name = AUTO_NAMES.includes(ruleSet.name) ? `${ruleSet.name} (custom)` : ruleSet.name
  await query(
    `UPDATE hub.pay_rules SET active = FALSE, updated_at = NOW()
     WHERE carrier_id = $1 AND driver_id = $2 AND active`,
    [carrierId, driverId]
  )
  const rows = await query<{ id: string }>(
    `INSERT INTO hub.pay_rules (carrier_id, driver_id, name, rules, deductions, active)
     VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
    [carrierId, driverId, name, JSON.stringify(ruleSet.rules), JSON.stringify(ruleSet.deductions)]
  )
  return rows[0]
}

/**
 * Drop back to the rule set the driver form maintains. Deactivates the custom
 * program and re-syncs the auto one from the driver's own pay fields, so the
 * driver is never left with no active rule set at all.
 */
export async function resetPayRulesToAuto(
  carrierId: string,
  driverId: string,
  config: DriverPayConfig
): Promise<void> {
  await query(
    `UPDATE hub.pay_rules SET active = FALSE, updated_at = NOW()
     WHERE carrier_id = $1 AND driver_id = $2 AND active`,
    [carrierId, driverId]
  )
  await syncDefaultPayRules(carrierId, driverId, config)
}
