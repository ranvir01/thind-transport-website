/**
 * Recruiting & driver lifecycle (E5): an ATS-lite over the public DOT
 * application wizard. Pipeline: applied → screened → MVR/PSP → road test →
 * drug test → offer → orientation → active. Conversion to a dispatch-legal
 * driver is gated by the orientation checklist and pre-populates the DQ file.
 */
import { hubDb, query, queryOne } from "./db"
import { ORIENTATION_TEMPLATE, type Applicant, type ApplicantStage } from "./recruiting-shared"

export {
  APPLICANT_STAGES, ORIENTATION_TEMPLATE, STAGE_LABELS,
} from "./recruiting-shared"
export type { Applicant, ApplicantStage } from "./recruiting-shared"

export async function listApplicants(carrierId: string): Promise<Applicant[]> {
  return query<Applicant>(
    `SELECT a.*,
       rd.first_name || ' ' || rd.last_name AS referrer_name,
       o.status AS offer_status
     FROM hub.applicants a
     LEFT JOIN hub.referrals r ON r.applicant_id = a.id
     LEFT JOIN hub.drivers rd ON rd.id = r.referrer_driver_id
     LEFT JOIN LATERAL (
       SELECT status FROM hub.offers WHERE applicant_id = a.id ORDER BY created_at DESC LIMIT 1
     ) o ON TRUE
     WHERE a.carrier_id = $1
     ORDER BY a.created_at DESC
     LIMIT 300`,
    [carrierId]
  )
}

export async function getApplicant(carrierId: string, id: string): Promise<Applicant | null> {
  return queryOne<Applicant>(
    `SELECT a.*,
       rd.first_name || ' ' || rd.last_name AS referrer_name,
       o.status AS offer_status
     FROM hub.applicants a
     LEFT JOIN hub.referrals r ON r.applicant_id = a.id
     LEFT JOIN hub.drivers rd ON rd.id = r.referrer_driver_id
     LEFT JOIN LATERAL (
       SELECT status FROM hub.offers WHERE applicant_id = a.id ORDER BY created_at DESC LIMIT 1
     ) o ON TRUE
     WHERE a.carrier_id = $1 AND a.id = $2`,
    [carrierId, id]
  )
}

export async function createApplicant(
  carrierId: string,
  input: {
    firstName: string
    lastName: string
    phone?: string | null
    email?: string | null
    cdlNumber?: string | null
    cdlState?: string | null
    yearsExperience?: number | null
    source?: "public_site" | "manual" | "referral"
    notes?: string | null
    application?: unknown
    publicApplicationId?: string | null
  },
  actorName: string
): Promise<Applicant | null> {
  const rows = await query<Applicant>(
    `INSERT INTO hub.applicants (carrier_id, source, first_name, last_name, phone, email,
       cdl_number, cdl_state, years_experience, notes, application, public_application_id, orientation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (carrier_id, public_application_id) WHERE public_application_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [
      carrierId, input.source ?? "manual", input.firstName, input.lastName,
      input.phone ?? null, input.email ?? null, input.cdlNumber ?? null, input.cdlState ?? null,
      input.yearsExperience ?? null, input.notes ?? null,
      input.application != null ? JSON.stringify(input.application) : null,
      input.publicApplicationId ?? null,
      JSON.stringify(ORIENTATION_TEMPLATE),
    ]
  )
  const applicant = rows[0] ?? null
  if (applicant) {
    await query(
      `INSERT INTO hub.applicant_events (carrier_id, applicant_id, from_stage, to_stage, actor_name)
       VALUES ($1, $2, NULL, 'applied', $3)`,
      [carrierId, applicant.id, actorName]
    )
  }
  return applicant
}

export async function moveApplicantStage(
  carrierId: string,
  id: string,
  toStage: ApplicantStage,
  actorName: string,
  note?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const applicant = await getApplicant(carrierId, id)
  if (!applicant) return { ok: false, error: "Applicant not found" }
  if (applicant.stage === toStage) return { ok: true }
  if (toStage === "active") {
    return { ok: false, error: "Use “Convert to driver” — hiring runs through the orientation gate" }
  }
  await query(
    `UPDATE hub.applicants SET stage = $3, rejected_reason = $4, updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2`,
    [carrierId, id, toStage, toStage === "rejected" ? note ?? "No reason recorded" : null]
  )
  await query(
    `INSERT INTO hub.applicant_events (carrier_id, applicant_id, from_stage, to_stage, note, actor_name)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [carrierId, id, applicant.stage, toStage, note ?? null, actorName]
  )
  return { ok: true }
}

export async function applicantEvents(carrierId: string, applicantId: string) {
  return query<{ from_stage: string | null; to_stage: string; note: string | null; actor_name: string | null; created_at: string }>(
    `SELECT from_stage, to_stage, note, actor_name, created_at
     FROM hub.applicant_events WHERE carrier_id = $1 AND applicant_id = $2
     ORDER BY created_at`,
    [carrierId, applicantId]
  )
}

export async function toggleOrientationItem(
  carrierId: string,
  applicantId: string,
  key: string,
  done: boolean
): Promise<void> {
  await query(
    `UPDATE hub.applicants
     SET orientation = (
       SELECT jsonb_agg(CASE WHEN item->>'key' = $3 THEN jsonb_set(item, '{done}', to_jsonb($4::boolean)) ELSE item END)
       FROM jsonb_array_elements(orientation) item
     ), updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2`,
    [carrierId, applicantId, key, done]
  )
}

/**
 * The orientation gate: every checklist item done AND a signed offer.
 * Conversion creates the hub driver with the DQ file pre-populated.
 */
export async function convertApplicantToDriver(
  carrierId: string,
  applicantId: string,
  config: {
    payType: "per_mile" | "percentage"
    payRate: number
    hireDate: string
  },
  actor: { id: string; name: string }
): Promise<{ ok: boolean; error?: string; driverId?: string }> {
  const applicant = await getApplicant(carrierId, applicantId)
  if (!applicant) return { ok: false, error: "Applicant not found" }
  if (applicant.converted_driver_id) return { ok: false, error: "Already converted" }

  const unfinished = (applicant.orientation ?? []).filter((i) => !i.done)
  if (unfinished.length > 0) {
    return {
      ok: false,
      error: `Orientation isn't done: ${unfinished.map((i) => i.label).join(", ")}`,
    }
  }
  const offer = await queryOne<{ status: string }>(
    `SELECT status FROM hub.offers WHERE applicant_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [applicantId]
  )
  if (!offer || offer.status !== "signed") {
    return { ok: false, error: "The offer letter has to be signed first" }
  }

  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    const { rows: driverRows } = await client.query(
      `INSERT INTO hub.drivers (carrier_id, first_name, last_name, phone, email,
         cdl_number, cdl_state, hire_date, pay_type, pay_rate, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active') RETURNING id`,
      [
        carrierId, applicant.first_name, applicant.last_name, applicant.phone, applicant.email,
        applicant.cdl_number, applicant.cdl_state, config.hireDate, config.payType, config.payRate,
      ]
    )
    const driverId = driverRows[0].id as string

    // DQ-file compliance items (49 CFR 391.51) pre-populated from the wizard.
    const dqItems = [
      "DQ: CDL copy on file",
      "DQ: Medical certificate on file",
      "DQ: MVR (pre-hire) on file",
      "DQ: PSP report on file",
      "DQ: Road test certificate",
      "DQ: Pre-employment drug test result",
      "DQ: Previous-employer safety verification",
      "DQ: Clearinghouse pre-employment query",
    ]
    for (const kind of dqItems) {
      await client.query(
        `INSERT INTO hub.compliance_items (carrier_id, entity_type, entity_id, kind, due_on, status, note)
         VALUES ($1, 'driver', $2, $3, CURRENT_DATE + 14, 'open', 'Auto-created at hire — file the document and mark done')`,
        [carrierId, driverId, kind]
      )
    }

    // Move applicant documents (PSP/MVR/CDL/offer) onto the driver file.
    await client.query(
      `UPDATE hub.documents SET entity_type = 'driver', entity_id = $2
       WHERE entity_type = 'applicant' AND entity_id = $1`,
      [applicantId, driverId]
    )

    await client.query(
      `UPDATE hub.applicants SET stage = 'active', converted_driver_id = $3, updated_at = NOW()
       WHERE carrier_id = $1 AND id = $2`,
      [carrierId, applicantId, driverId]
    )
    await client.query(
      `INSERT INTO hub.applicant_events (carrier_id, applicant_id, from_stage, to_stage, actor_name, note)
       VALUES ($1, $2, $3, 'active', $4, 'Converted to driver')`,
      [carrierId, applicantId, applicant.stage, actor.name]
    )
    // Referral milestone: hired → bonus becomes payable on the next settlement.
    await client.query(
      `UPDATE hub.referrals SET status = 'payable', updated_at = NOW()
       WHERE carrier_id = $1 AND applicant_id = $2 AND milestone = 'hired' AND status = 'pending'`,
      [carrierId, applicantId]
    )
    await client.query("COMMIT")

    // Default pay rules for the new driver (outside the txn — non-critical).
    const { syncDefaultPayRules } = await import("./pay-rules-db")
    await syncDefaultPayRules(carrierId, driverId, {
      payType: config.payType,
      payRate: config.payRate,
      payLoadedMilesOnly: true,
      escrowWeeklyCents: 0,
      insuranceWeeklyCents: 0,
    })

    return { ok: true, driverId }
  } catch (err) {
    await client.query("ROLLBACK")
    return { ok: false, error: err instanceof Error ? err.message : "Conversion failed" }
  } finally {
    client.release()
  }
}

// ---- Offers ----

export async function createOffer(
  carrierId: string,
  applicantId: string,
  input: { paySummary: string; startDate: string | null; body: string },
  actorName: string
): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO hub.offers (carrier_id, applicant_id, pay_summary, start_date, body, created_by_name)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [carrierId, applicantId, input.paySummary, input.startDate, input.body, actorName]
  )
  return rows[0].id
}

export async function signOffer(
  carrierId: string,
  offerId: string,
  signature: string,
  signedName: string
): Promise<boolean> {
  const rows = await query(
    `UPDATE hub.offers SET status = 'signed', signature = $3, signed_name = $4, signed_at = NOW()
     WHERE carrier_id = $1 AND id = $2 AND status = 'sent' RETURNING id`,
    [carrierId, offerId, signature, signedName]
  )
  return rows.length > 0
}

export async function latestOffer(carrierId: string, applicantId: string) {
  return queryOne<{
    id: string; pay_summary: string; start_date: string | null; body: string
    status: string; signed_name: string | null; signed_at: string | null
  }>(
    `SELECT id, pay_summary, start_date, body, status, signed_name, signed_at
     FROM hub.offers WHERE carrier_id = $1 AND applicant_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [carrierId, applicantId]
  )
}

// ---- Referrals ----

export async function attachReferral(
  carrierId: string,
  applicantId: string,
  referrerDriverId: string,
  bonusCents: number
): Promise<void> {
  await query(
    `INSERT INTO hub.referrals (carrier_id, applicant_id, referrer_driver_id, bonus_cents, milestone)
     VALUES ($1,$2,$3,$4,'hired')`,
    [carrierId, applicantId, referrerDriverId, bonusCents]
  )
  await query(
    `UPDATE hub.applicants SET source = 'referral', updated_at = NOW() WHERE carrier_id = $1 AND id = $2`,
    [carrierId, applicantId]
  )
}

// ---- Public-site bridge ----

/**
 * Pull new applications submitted on the public website into the pipeline
 * (Thind tenant). Dedupe by public application id; safe to run repeatedly.
 */
export async function importPublicApplicants(
  carrierId: string,
  actorName: string
): Promise<{ imported: number }> {
  const exists = await queryOne<{ reg: string | null }>(
    `SELECT to_regclass('public.public_applications')::text AS reg`
  )
  if (!exists?.reg) return { imported: 0 }

  const rows = await query<{
    id: string; first_name: string; last_name: string; email: string | null
    phone: string | null; driver_type: string | null; data: unknown
  }>(
    `SELECT p.id, p.first_name, p.last_name, p.email, p.phone, p.driver_type, p.data
     FROM public.public_applications p
     WHERE NOT EXISTS (
       SELECT 1 FROM hub.applicants a
       WHERE a.carrier_id = $1 AND a.public_application_id = p.id::text
     )
     ORDER BY p.created_at DESC LIMIT 100`,
    [carrierId]
  )
  let imported = 0
  for (const row of rows) {
    const created = await createApplicant(
      carrierId,
      {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        source: "public_site",
        notes: row.driver_type ? `Applied as: ${row.driver_type}` : null,
        application: row.data,
        publicApplicationId: String(row.id),
      },
      actorName
    )
    if (created) imported++
  }
  return { imported }
}

// ---- Scorecards ----

/**
 * Monthly driver scorecard:
 *   on-time % (deliveries arrived before the appointment window closed),
 *   MPG vs fleet (loaded miles ÷ tractor gallons),
 *   incidents in the month.
 * Composite 0–100: 70% on-time + 30% MPG-vs-fleet (capped at 120%), minus
 * 15 points per incident. Plain enough to defend in a driver meeting.
 */
export async function computeDriverScores(
  carrierId: string,
  monthISO?: string
): Promise<{ drivers: number }> {
  const month = monthISO ?? `${new Date().toISOString().slice(0, 7)}-01`

  const fleet = await queryOne<{ miles: string | null; gallons: string | null }>(
    `SELECT
       (SELECT SUM(loaded_miles) FROM hub.loads
         WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'cancelled'
           AND created_at >= $2::date AND created_at < $2::date + INTERVAL '1 month') AS miles,
       (SELECT SUM(gallons) FROM hub.fuel_transactions
         WHERE carrier_id = $1 AND fuel_use = 'tractor'
           AND ts >= $2::date AND ts < $2::date + INTERVAL '1 month') AS gallons`,
    [carrierId, month]
  )
  const fleetMpg =
    fleet?.miles && fleet?.gallons && Number(fleet.gallons) > 0
      ? Number(fleet.miles) / Number(fleet.gallons)
      : null

  const drivers = await query<{ id: string }>(
    `SELECT id FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active'`,
    [carrierId]
  )

  for (const driver of drivers) {
    const stats = await queryOne<{
      delivered: string; on_time: string; miles: string | null; gallons: string | null; incidents: string
    }>(
      `SELECT
         (SELECT COUNT(*) FROM hub.stops s JOIN hub.loads l ON l.id = s.load_id
           WHERE l.carrier_id = $1 AND l.driver_id = $2 AND s.type = 'delivery' AND s.arrived_at IS NOT NULL
             AND s.arrived_at >= $3::date AND s.arrived_at < $3::date + INTERVAL '1 month') AS delivered,
         (SELECT COUNT(*) FROM hub.stops s JOIN hub.loads l ON l.id = s.load_id
           WHERE l.carrier_id = $1 AND l.driver_id = $2 AND s.type = 'delivery' AND s.arrived_at IS NOT NULL
             AND s.arrived_at >= $3::date AND s.arrived_at < $3::date + INTERVAL '1 month'
             AND (s.appt_start IS NULL OR s.arrived_at <= COALESCE(s.appt_end, s.appt_start + INTERVAL '2 hours'))) AS on_time,
         (SELECT SUM(l.loaded_miles) FROM hub.loads l
           WHERE l.carrier_id = $1 AND l.driver_id = $2 AND l.deleted_at IS NULL AND l.status <> 'cancelled'
             AND l.created_at >= $3::date AND l.created_at < $3::date + INTERVAL '1 month') AS miles,
         (SELECT SUM(f.gallons) FROM hub.fuel_transactions f
           WHERE f.carrier_id = $1 AND f.driver_id = $2 AND f.fuel_use = 'tractor'
             AND f.ts >= $3::date AND f.ts < $3::date + INTERVAL '1 month') AS gallons,
         (SELECT COUNT(*) FROM hub.incidents i
           WHERE i.carrier_id = $1 AND i.driver_id = $2
             AND i.occurred_at >= $3::date AND i.occurred_at < $3::date + INTERVAL '1 month') AS incidents`,
      [carrierId, driver.id, month]
    )
    const delivered = Number(stats?.delivered ?? 0)
    const incidents = Number(stats?.incidents ?? 0)
    if (delivered === 0 && incidents === 0) continue

    const onTimePct = delivered > 0 ? (Number(stats!.on_time) / delivered) * 100 : null
    const mpg =
      stats?.miles && stats?.gallons && Number(stats.gallons) > 0
        ? Number(stats.miles) / Number(stats.gallons)
        : null

    const mpgRatio = mpg != null && fleetMpg ? Math.min(mpg / fleetMpg, 1.2) : 1
    const composite = Math.max(
      0,
      Math.min(
        100,
        Math.round(((onTimePct ?? 100) * 0.7 + (mpgRatio / 1.2) * 100 * 0.3 - incidents * 15) * 10) / 10
      )
    )

    await query(
      `INSERT INTO hub.driver_scores (carrier_id, driver_id, month, on_time_pct, mpg, fleet_mpg, incidents, loads_delivered, composite)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (carrier_id, driver_id, month) DO UPDATE SET
         on_time_pct = EXCLUDED.on_time_pct, mpg = EXCLUDED.mpg, fleet_mpg = EXCLUDED.fleet_mpg,
         incidents = EXCLUDED.incidents, loads_delivered = EXCLUDED.loads_delivered,
         composite = EXCLUDED.composite, computed_at = NOW()`,
      [
        carrierId, driver.id, month,
        onTimePct != null ? Math.round(onTimePct * 10) / 10 : null,
        mpg != null ? Math.round(mpg * 100) / 100 : null,
        fleetMpg != null ? Math.round(fleetMpg * 100) / 100 : null,
        incidents, delivered, composite,
      ]
    )
  }
  return { drivers: drivers.length }
}

export async function driverScoreHistory(carrierId: string, driverId: string, limit = 6) {
  return query<{
    month: string; on_time_pct: string | null; mpg: string | null; fleet_mpg: string | null
    incidents: number; loads_delivered: number; composite: string
  }>(
    `SELECT month, on_time_pct, mpg, fleet_mpg, incidents, loads_delivered, composite
     FROM hub.driver_scores WHERE carrier_id = $1 AND driver_id = $2
     ORDER BY month DESC LIMIT $3`,
    [carrierId, driverId, limit]
  )
}
