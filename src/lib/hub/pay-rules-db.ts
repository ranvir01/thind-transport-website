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
