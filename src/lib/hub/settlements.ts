import { hubDb, query, queryOne } from "./db"
import {
  evaluatePayRules, legacyConfigToRuleSet, parseRuleSet, type PayLoadContext,
} from "./pay-rules"
import { getCarrier, getCarrierSettings } from "./settings"
import { storeGeneratedPdf } from "./documents"
import { buildSettlementPdf } from "./pdf"
import { logAudit } from "./audit"
import { assertCarrierRefs } from "./tenancy"
import { toIsoDateOnly } from "./format-dates"
import { createMailTransport, isEmailConfigured, mailFrom } from "@/lib/mailer"
import type { Advance, Driver, Settlement, SettlementLine } from "./types"

export async function listSettlements(carrierId: string): Promise<Settlement[]> {
  return query<Settlement>(
    `SELECT s.*, d.first_name || ' ' || d.last_name AS driver_name, d.pay_type
     FROM hub.settlements s JOIN hub.drivers d ON d.id = s.driver_id AND d.carrier_id = s.carrier_id
     WHERE s.carrier_id = $1 ORDER BY s.period_end DESC, driver_name LIMIT 200`,
    [carrierId]
  )
}

export async function getSettlement(carrierId: string, id: string): Promise<Settlement | null> {
  return queryOne<Settlement>(
    `SELECT s.*, d.first_name || ' ' || d.last_name AS driver_name, d.pay_type
     FROM hub.settlements s JOIN hub.drivers d ON d.id = s.driver_id AND d.carrier_id = s.carrier_id
     WHERE s.carrier_id = $1 AND s.id = $2`,
    [carrierId, id]
  )
}

export async function getSettlementLines(carrierId: string, settlementId: string): Promise<SettlementLine[]> {
  return query<SettlementLine>(
    `SELECT sl.* FROM hub.settlement_lines sl
     JOIN hub.settlements s ON s.id = sl.settlement_id AND s.carrier_id = $1
     WHERE sl.settlement_id = $2 ORDER BY sl.kind, sl.created_at`,
    [carrierId, settlementId]
  )
}

/**
 * Referral bonuses that became payable and have not yet been paid through a
 * settlement (E5). Returns [] until the recruiting module's tables exist so
 * the settlement engine never depends on a later migration.
 */
async function payableReferralBonuses(
  carrierId: string,
  driverId: string
): Promise<{ label: string; amountCents: number; sourceId: string }[]> {
  const exists = await queryOne<{ reg: string | null }>(
    `SELECT to_regclass('hub.referrals')::text AS reg`
  )
  if (!exists?.reg) return []
  const rows = await query<{ id: string; bonus_cents: number; applicant_name: string; milestone: string }>(
    `SELECT r.id, r.bonus_cents, COALESCE(a.first_name || ' ' || a.last_name, 'driver') AS applicant_name, r.milestone
     FROM hub.referrals r
     LEFT JOIN hub.applicants a ON a.id = r.applicant_id AND a.carrier_id = r.carrier_id
     WHERE r.carrier_id = $1 AND r.referrer_driver_id = $2 AND r.status = 'payable'`,
    [carrierId, driverId]
  )
  return rows.map((r) => ({
    label: `Referral bonus — ${r.applicant_name} (${r.milestone.replace(/_/g, " ")})`,
    amountCents: Number(r.bonus_cents),
    sourceId: r.id,
  }))
}

/** Latest monthly scorecard composite for scorecard_bonus rules (E5). */
async function latestScorecardScore(carrierId: string, driverId: string): Promise<number | null> {
  const exists = await queryOne<{ reg: string | null }>(
    `SELECT to_regclass('hub.driver_scores')::text AS reg`
  )
  if (!exists?.reg) return null
  const row = await queryOne<{ composite: string }>(
    `SELECT composite FROM hub.driver_scores
     WHERE carrier_id = $1 AND driver_id = $2 ORDER BY month DESC LIMIT 1`,
    [carrierId, driverId]
  )
  return row ? Number(row.composite) : null
}

/**
 * Draft weekly settlements: for each active driver, gather unsettled
 * delivered+ loads, reimbursable unsettled expenses, and outstanding advances,
 * run the pure engine, and persist draft + lines.
 */
export async function draftSettlements(
  carrierId: string,
  periodStart: string,
  periodEnd: string,
  actor: { id: string; name: string }
): Promise<{ created: number; skipped: number }> {
  const drivers = await query<Driver>(
    `SELECT * FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active'`,
    [carrierId]
  )
  let created = 0
  let skipped = 0

  for (const driver of drivers) {
    // Loads delivered or beyond, not yet attached to a settlement
    const loads = await query<{
      id: string; reference: string; linehaul_cents: number; fuel_surcharge_cents: number
      accessorials: { label?: string; amount_cents: number }[]; loaded_miles: number | null; deadhead_miles: number | null
      stops_count: number | null
    }>(
      `SELECT id, reference, linehaul_cents, fuel_surcharge_cents, accessorials, loaded_miles, deadhead_miles,
         (SELECT COUNT(*)::int FROM hub.stops s WHERE s.load_id = hub.loads.id) AS stops_count
       FROM hub.loads
       WHERE carrier_id = $1 AND driver_id = $2 AND deleted_at IS NULL AND settlement_id IS NULL
         AND status IN ('delivered','pod_received','invoiced','paid')`,
      [carrierId, driver.id]
    )
    if (loads.length === 0) {
      skipped++
      continue
    }
    // Skip if a draft already exists for this driver+period (idempotent runs)
    const existing = await queryOne(
      `SELECT id FROM hub.settlements WHERE carrier_id = $1 AND driver_id = $2 AND period_start = $3 AND period_end = $4`,
      [carrierId, driver.id, periodStart, periodEnd]
    )
    if (existing) {
      skipped++
      continue
    }

    const reimbursables = await query<{ id: string; memo: string | null; category: string; amount_cents: number }>(
      `SELECT id, memo, category, amount_cents FROM hub.expenses
       WHERE carrier_id = $1 AND driver_id = $2 AND reimbursable = TRUE AND settled_line_id IS NULL`,
      [carrierId, driver.id]
    )
    const advances = await query<{ id: string; reference: string | null; amount_cents: number }>(
      `SELECT id, reference, amount_cents FROM hub.advances
       WHERE carrier_id = $1 AND driver_id = $2 AND status = 'outstanding'`,
      [carrierId, driver.id]
    )

    const loadInputs: PayLoadContext[] = loads.map((load) => {
      const accessorials = Array.isArray(load.accessorials) ? load.accessorials : []
      return {
        id: load.id,
        reference: load.reference,
        linehaulCents: Number(load.linehaul_cents),
        fuelSurchargeCents: Number(load.fuel_surcharge_cents),
        accessorialCents: accessorials.reduce((sum, a) => sum + Number(a.amount_cents || 0), 0),
        // Same matcher applyDetentionAccrual upserts with — lets percent rules
        // itemize the detention share as its own settlement line.
        detentionCents: accessorials
          .filter((a) => /detention/i.test(String(a.label ?? "")))
          .reduce((sum, a) => sum + Number(a.amount_cents || 0), 0),
        loadedMiles: load.loaded_miles ?? 0,
        deadheadMiles: load.deadhead_miles ?? 0,
        stopsCount: Number(load.stops_count ?? 0),
      }
    })

    // The settlement engine consumes ONLY the generic pay-rules evaluator.
    // A driver's rule set lives in hub.pay_rules (seeded from the legacy
    // two-pay-type columns by migration 005); the legacy conversion is the
    // fallback for drivers created before a rule set exists.
    const ruleRow = await queryOne<{ name: string; rules: unknown; deductions: unknown }>(
      `SELECT name, rules, deductions FROM hub.pay_rules
       WHERE carrier_id = $1 AND driver_id = $2 AND active
       ORDER BY updated_at DESC LIMIT 1`,
      [carrierId, driver.id]
    )
    const ruleSet = ruleRow
      ? parseRuleSet(ruleRow)
      : legacyConfigToRuleSet({
          payType: driver.pay_type,
          payRate: Number(driver.pay_rate),
          payLoadedMilesOnly: driver.pay_loaded_miles_only,
          escrowWeeklyCents: driver.escrow_weekly_cents,
          insuranceWeeklyCents: driver.insurance_weekly_cents,
        })

    const draft = evaluatePayRules(ruleSet, {
      loads: loadInputs,
      reimbursements: reimbursables.map((expense) => ({
        label: `${expense.category} reimbursement${expense.memo ? ` — ${expense.memo}` : ""}`,
        amountCents: Number(expense.amount_cents),
        sourceId: expense.id,
      })),
      outstandingAdvances: advances.map((advance) => ({
        id: advance.id, reference: advance.reference, amountCents: Number(advance.amount_cents),
      })),
      referralBonuses: await payableReferralBonuses(carrierId, driver.id),
      scorecardScore: await latestScorecardScore(carrierId, driver.id),
    })

    const client = await hubDb().connect()
    try {
      await client.query("BEGIN")
      const { rows } = await client.query(
        `INSERT INTO hub.settlements (carrier_id, driver_id, period_start, period_end, gross_cents, deductions_cents, net_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [carrierId, driver.id, periodStart, periodEnd, draft.grossCents, draft.deductionsCents, draft.netCents]
      )
      const settlementId = rows[0].id
      for (const line of draft.lines) {
        const { rows: lineRows } = await client.query(
          `INSERT INTO hub.settlement_lines (settlement_id, kind, label, amount_cents, source_type, source_id)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [settlementId, line.kind, line.label, line.amountCents, line.sourceType ?? null, line.sourceId ?? null]
        )
        // Mark reimbursed expenses so they never double-pay
        if (line.sourceType === "expense" && line.sourceId) {
          await client.query(
            `UPDATE hub.expenses SET settled_line_id = $1, updated_at = NOW() WHERE id = $2 AND carrier_id = $3`,
            [lineRows[0].id, line.sourceId, carrierId]
          )
        }
      }
      await client.query(
        `UPDATE hub.loads SET settlement_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[]) AND carrier_id = $3`,
        [settlementId, loads.map((l) => l.id), carrierId]
      )
      await client.query("COMMIT")
      created++
      await logAudit({
        carrierId, actorId: actor.id, actorName: actor.name,
        entityType: "settlement", entityId: settlementId, action: "draft",
        newValue: { driver: `${driver.first_name} ${driver.last_name}`, net: draft.netCents, loads: loads.length },
      })
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  }
  return { created, skipped }
}

/** Approve: advances applied, escrow ledger appended, PDF statement generated + emailed. */
export async function approveSettlement(
  carrierId: string,
  settlementId: string,
  actor: { id: string; name: string }
): Promise<{ emailed: boolean }> {
  const settlement = await getSettlement(carrierId, settlementId)
  if (!settlement) throw new Error("Settlement not found")
  if (settlement.status !== "draft") throw new Error("Only drafts can be approved")
  const lines = await getSettlementLines(carrierId, settlementId)
  const driver = await queryOne<Driver>(
    `SELECT * FROM hub.drivers WHERE id = $1 AND carrier_id = $2`,
    [settlement.driver_id, carrierId]
  )
  const carrier = await getCarrier(carrierId)
  const settings = await getCarrierSettings(carrierId)

  // Claim draft -> approved atomically BEFORE any side effect. The escrow
  // append below is not idempotent, so a concurrent double-approve (or a
  // retry after a mid-flight failure) must lose here, not after the ledger
  // already grew twice.
  const claimed = await query<{ id: string }>(
    `UPDATE hub.settlements SET status = 'approved', approved_by = $3, approved_at = NOW(), updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2 AND status = 'draft' RETURNING id`,
    [carrierId, settlementId, actor.id]
  )
  if (claimed.length === 0) throw new Error("Only drafts can be approved")

  // Apply advances
  for (const line of lines.filter((l) => l.source_type === "advance" && l.source_id)) {
    await query(
      `UPDATE hub.advances SET status = 'applied', applied_settlement_id = $1, updated_at = NOW() WHERE id = $2 AND carrier_id = $3 AND status = 'outstanding'`,
      [settlementId, line.source_id, carrierId]
    )
  }
  // Referral bonuses paid through this settlement flip to 'paid' (E5)
  const referralLines = lines.filter((l) => l.source_type === "referral" && l.source_id)
  if (referralLines.length > 0) {
    await query(
      `UPDATE hub.referrals SET status = 'paid', paid_settlement_id = $1, updated_at = NOW()
       WHERE carrier_id = $2 AND id = ANY($3::uuid[]) AND status = 'payable'`,
      [settlementId, carrierId, referralLines.map((l) => l.source_id)]
    ).catch(() => {}) // table arrives with the recruiting module
  }
  // Append escrow ledger. Two settlements for the same driver approved
  // concurrently (a backlog of unapproved weeks batch-approved together) would
  // both read the same last balance_cents and insert a wrong running total —
  // the same stale-read race already fixed in recordPayment. An advisory lock
  // keyed on driver_id serializes the read+insert per driver across concurrent
  // approvals without needing a row to lock (the first-ever ledger entry has none).
  const escrowLine = lines.find((l) => l.source_type === "escrow")
  if (escrowLine) {
    const client = await hubDb().connect()
    try {
      await client.query("BEGIN")
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [settlement.driver_id])
      const { rows: lastRows } = await client.query<{ balance_cents: number }>(
        `SELECT balance_cents FROM hub.escrow_ledger WHERE driver_id = $1 AND carrier_id = $2 ORDER BY id DESC LIMIT 1`,
        [settlement.driver_id, carrierId]
      )
      const newBalance = Number(lastRows[0]?.balance_cents ?? 0) + escrowLine.amount_cents
      await client.query(
        `INSERT INTO hub.escrow_ledger (carrier_id, driver_id, amount_cents, balance_cents, note, settlement_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [carrierId, settlement.driver_id, escrowLine.amount_cents, newBalance, "Weekly contribution", settlementId]
      )
      await client.query("COMMIT")
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  }

  const pdfBytes = await buildSettlementPdf({
    brand: {
      name: carrier?.name ?? "Carrier", address: carrier?.address, phone: carrier?.phone,
      email: carrier?.email, dot: carrier?.dot_number, mc: carrier?.mc_number,
      accent: settings.branding.accent,
    },
    driverName: settlement.driver_name ?? "Driver",
    periodStart: toIsoDateOnly(settlement.period_start) ?? "",
    periodEnd: toIsoDateOnly(settlement.period_end) ?? "",
    lines: lines.map((l) => ({ kind: l.kind, label: l.label, amountCents: l.amount_cents })),
    grossCents: settlement.gross_cents,
    deductionsCents: settlement.deductions_cents,
    netCents: settlement.net_cents,
  })
  const statementUrl = await storeGeneratedPdf(`settlement-${settlementId}.pdf`, pdfBytes)

  await query(
    `UPDATE hub.settlements SET statement_url = $3, updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2`,
    [carrierId, settlementId, statementUrl]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "settlement", entityId: settlementId, action: "approve",
    newValue: { net: settlement.net_cents },
  })

  let emailed = false
  if (driver?.email && isEmailConfigured()) {
    try {
      const transport = createMailTransport()
      await transport.sendMail({
        from: mailFrom(carrier?.name ?? "Payroll"),
        to: driver.email,
        subject: `Settlement ${toIsoDateOnly(settlement.period_start) ?? ""} — ${toIsoDateOnly(settlement.period_end) ?? ""}: $${(settlement.net_cents / 100).toFixed(2)}`,
        text: `Your settlement statement is attached.\n\nGross: $${(settlement.gross_cents / 100).toFixed(2)}\nDeductions: $${(settlement.deductions_cents / 100).toFixed(2)}\nNet pay: $${(settlement.net_cents / 100).toFixed(2)}\n\n${carrier?.name ?? ""}`,
        attachments: [{ filename: "settlement.pdf", content: Buffer.from(pdfBytes), contentType: "application/pdf" }],
      })
      emailed = true
    } catch { /* email is best-effort */ }
  }
  return { emailed }
}

export async function markSettlementPaid(
  carrierId: string,
  settlementId: string,
  actor: { id: string; name: string }
): Promise<boolean> {
  const updated = await query(
    `UPDATE hub.settlements SET status = 'paid', updated_at = NOW() WHERE carrier_id = $1 AND id = $2 AND status = 'approved' RETURNING id`,
    [carrierId, settlementId]
  )
  if (updated.length === 0) return false
  // Close out fully-paid loads attached to this settlement
  const loads = await query<{ id: string; status: string }>(
    `SELECT id, status FROM hub.loads WHERE settlement_id = $1 AND carrier_id = $2`,
    [settlementId, carrierId]
  )
  for (const load of loads) {
    if (load.status === "paid") {
      await query(`UPDATE hub.loads SET status = 'settled', updated_at = NOW() WHERE id = $1 AND carrier_id = $2`, [load.id, carrierId])
    }
  }
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "settlement", entityId: settlementId, action: "paid",
  })
  return true
}

// ---- Advances + escrow ----

export async function listAdvances(carrierId: string): Promise<Advance[]> {
  return query<Advance>(
    `SELECT a.*, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.advances a JOIN hub.drivers d ON d.id = a.driver_id AND d.carrier_id = a.carrier_id
     WHERE a.carrier_id = $1 ORDER BY a.created_at DESC LIMIT 200`,
    [carrierId]
  )
}

export async function createAdvance(
  carrierId: string,
  input: { driverId: string; amountCents: number; issuedOn: string; reference?: string | null },
  actor: { id: string; name: string }
): Promise<void> {
  await assertCarrierRefs(carrierId, { driver_id: input.driverId })
  const rows = await query<{ id: string }>(
    `INSERT INTO hub.advances (carrier_id, driver_id, amount_cents, issued_on, reference, status)
     VALUES ($1,$2,$3,$4,$5,'outstanding') RETURNING id`,
    [carrierId, input.driverId, input.amountCents, input.issuedOn, input.reference ?? null]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "advance", entityId: rows[0].id, action: "create",
    newValue: input,
  })
}

export interface EscrowBalance {
  driver_id: string
  driver_name: string
  balance_cents: number
}

export async function escrowBalances(carrierId: string): Promise<EscrowBalance[]> {
  return query<EscrowBalance>(
    `SELECT DISTINCT ON (e.driver_id) e.driver_id,
       d.first_name || ' ' || d.last_name AS driver_name, e.balance_cents
     FROM hub.escrow_ledger e JOIN hub.drivers d ON d.id = e.driver_id AND d.carrier_id = e.carrier_id
     WHERE e.carrier_id = $1
     ORDER BY e.driver_id, e.id DESC`,
    [carrierId]
  )
}
