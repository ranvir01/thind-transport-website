import "server-only"
import { query } from "./db"
import { SANDBOX_CARRIER_ID } from "./sandbox"
import { emptyMetrics, type ShiftMetrics, type ShiftSeatKey } from "./sandbox-objectives"

/**
 * Shift Mode's metric readers: a handful of cheap carrier-scoped counts,
 * snapshot at clock-in (baseline) and again on demand (live objectives,
 * clock-out recap). Player attribution rides the audit trails the domain
 * functions already write — load_events.actor_id for status moves,
 * audit_log.actor_id for invoices — so NPC activity never pads a score.
 */

const C = SANDBOX_CARRIER_ID

/**
 * Bump a shift telemetry counter (review A2) — the weekly audit reads
 * settings.sim.telemetry to see whether demo users actually play. The seat
 * key is validated by callers (isShiftSeat) and scrubbed here anyway; the
 * inner jsonb_set materializes the telemetry object so the bump works on a
 * freshly-seeded world that has never ticked.
 */
export async function bumpShiftCounter(kind: "shiftsStarted" | "shiftsCompleted", seat: string): Promise<void> {
  const key = `${kind}_${seat}`.replace(/[^a-zA-Z_]/g, "")
  await query(
    `UPDATE hub.carrier_settings
        SET settings = jsonb_set(
              jsonb_set(settings, '{sim,telemetry}', COALESCE(settings->'sim'->'telemetry', '{}'::jsonb), true),
              '{sim,telemetry,${key}}',
              to_jsonb(COALESCE((settings->'sim'->'telemetry'->>'${key}')::int, 0) + 1), true)
      WHERE carrier_id = $1 AND settings ? 'sim'`,
    [C]
  )
}

/** Current sim epoch — a reset mints a new one, voiding in-flight shifts. */
export async function readSimEpoch(): Promise<string | null> {
  const rows = await query<{ epoch: string | null }>(
    `SELECT settings->'sim'->>'epoch' AS epoch FROM hub.carrier_settings WHERE carrier_id = $1`,
    [C]
  )
  return rows[0]?.epoch ?? null
}

/**
 * Owner seat: settlement approvals, payouts, advances, payments. Every
 * counter is actor-scoped — the sim's autopilot records payments of its own
 * (sandbox-sim.ts payInvoice, actor id null) and must never pad a score.
 */
async function ownerMetrics(userId: string): Promise<Partial<ShiftMetrics>> {
  const [audits, queue] = await Promise.all([
    query<{ entity_type: string; action: string; n: number }>(
      `SELECT entity_type, action, COUNT(*)::int AS n
         FROM hub.audit_log
        WHERE carrier_id = $1 AND actor_id = $2
          AND ((entity_type = 'settlement' AND action IN ('approve','paid'))
            OR (entity_type = 'advance' AND action = 'create')
            OR (entity_type = 'payment' AND action = 'record'))
        GROUP BY 1, 2`,
      [C, userId]
    ),
    query<{ drafts: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts
         FROM hub.settlements WHERE carrier_id = $1`,
      [C]
    ),
  ])
  const n = (entity: string, action: string) =>
    audits.find((a) => a.entity_type === entity && a.action === action)?.n ?? 0
  return {
    mySettlementApprovals: n("settlement", "approve"),
    mySettlementPayouts: n("settlement", "paid"),
    myAdvances: n("advance", "create"),
    myPayments: n("payment", "record"),
    draftSettlements: queue[0]?.drafts ?? 0,
  }
}

/**
 * Safety seat: the incident register and the repair that releases a grounded
 * truck. `incidents.reported_by` and `dvirs.repair_certified_by` carry the
 * actor on the row itself; closing an incident has no such column, so it
 * rides the audit trail the action always writes.
 */
async function safetyMetrics(userId: string): Promise<Partial<ShiftMetrics>> {
  const [incidents, certs, audits] = await Promise.all([
    query<{ mine: number; open: number }>(
      `SELECT COUNT(*) FILTER (WHERE reported_by = $2)::int AS mine,
              COUNT(*) FILTER (WHERE status = 'open')::int AS open
         FROM hub.incidents WHERE carrier_id = $1`,
      [C, userId]
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM hub.dvirs
        WHERE carrier_id = $1 AND repair_certified_by = $2 AND repair_certified_at IS NOT NULL`,
      [C, userId]
    ),
    query<{ entity_type: string; closed: number; n: number }>(
      `SELECT entity_type,
              COUNT(*) FILTER (WHERE new_value->>'status' = 'closed')::int AS closed,
              COUNT(*)::int AS n
         FROM hub.audit_log
        WHERE carrier_id = $1 AND actor_id = $2
          AND ((entity_type = 'incident' AND action = 'update')
            OR (entity_type = 'random_test_event' AND action = 'result'))
        GROUP BY 1`,
      [C, userId]
    ),
  ])
  return {
    myIncidents: incidents[0]?.mine ?? 0,
    openIncidents: incidents[0]?.open ?? 0,
    myRepairCerts: certs[0]?.n ?? 0,
    myIncidentsClosed: audits.find((a) => a.entity_type === "incident")?.closed ?? 0,
    myRandomTestResults: audits.find((a) => a.entity_type === "random_test_event")?.n ?? 0,
  }
}

/**
 * Recruiter seat. `hub.applicant_events` has no actor_id column (only
 * actor_name), so stage moves match the seat's own name — safe here because
 * sandbox seat names are unique and the recruiting domain has no autopilot
 * writing events. Signatures and hires use the stronger audit_log actor_id.
 */
async function recruiterMetrics(userId: string): Promise<Partial<ShiftMetrics>> {
  const [stages, audits, pipeline] = await Promise.all([
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM hub.applicant_events e
        WHERE e.carrier_id = $1 AND e.from_stage IS NOT NULL
          AND e.actor_name = (SELECT u.name FROM hub.users u WHERE u.id = $2 AND u.carrier_id = $1)`,
      [C, userId]
    ),
    query<{ entity_type: string; n: number }>(
      `SELECT entity_type, COUNT(*)::int AS n
         FROM hub.audit_log
        WHERE carrier_id = $1 AND actor_id = $2
          AND ((entity_type = 'offer' AND action = 'signed')
            OR (entity_type = 'applicant' AND action = 'converted_to_driver'))
        GROUP BY 1`,
      [C, userId]
    ),
    query<{ waiting: number }>(
      `SELECT COUNT(*)::int AS waiting FROM hub.applicants
        WHERE carrier_id = $1 AND stage = 'applied'`,
      [C]
    ),
  ])
  return {
    myStageAdvances: stages[0]?.n ?? 0,
    myOffersSigned: audits.find((a) => a.entity_type === "offer")?.n ?? 0,
    myHires: audits.find((a) => a.entity_type === "applicant")?.n ?? 0,
    applicantsWaiting: pipeline[0]?.waiting ?? 0,
  }
}

/**
 * Owner-operator extras: the money and equipment that are HIS, not the
 * company's. Advances and DVIRs join through drivers.user_id so another
 * driver's paperwork can never count; receipts ride the driver-side audit
 * action (`expense`/`driver_receipt`), which only the phone app writes.
 */
async function ownerOperatorMetrics(userId: string): Promise<Partial<ShiftMetrics>> {
  const [advances, dvirs, receipts] = await Promise.all([
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM hub.advances a
         JOIN hub.drivers d ON d.id = a.driver_id AND d.carrier_id = $1
        WHERE a.carrier_id = $1 AND d.user_id = $2`,
      [C, userId]
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM hub.dvirs v
         JOIN hub.drivers d ON d.id = v.driver_id AND d.carrier_id = $1
        WHERE v.carrier_id = $1 AND d.user_id = $2`,
      [C, userId]
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM hub.audit_log
        WHERE carrier_id = $1 AND actor_id = $2
          AND entity_type = 'expense' AND action = 'driver_receipt'`,
      [C, userId]
    ),
  ])
  return {
    myAdvanceRequests: advances[0]?.n ?? 0,
    myDvirs: dvirs[0]?.n ?? 0,
    myReceipts: receipts[0]?.n ?? 0,
  }
}

export async function readShiftMetrics(
  userId: string,
  seat: ShiftSeatKey,
  now = new Date()
): Promise<ShiftMetrics> {
  // Office seats score entirely different work, so they run their own reads
  // instead of paying for the load-board counters they never look at.
  if (seat === "owner") return { ...emptyMetrics(now.toISOString()), ...(await ownerMetrics(userId)) }
  if (seat === "safety") return { ...emptyMetrics(now.toISOString()), ...(await safetyMetrics(userId)) }
  if (seat === "recruiter") {
    return { ...emptyMetrics(now.toISOString()), ...(await recruiterMetrics(userId)) }
  }

  const [moves, boards, arrivals, invoices, payments] = await Promise.all([
    query<{ to_status: string | null; n: number }>(
      `SELECT payload->>'to' AS to_status, COUNT(*)::int AS n
         FROM hub.load_events
        WHERE carrier_id = $1 AND kind = 'status_change' AND actor_id = $2
        GROUP BY 1`,
      [C, userId]
    ),
    query<{ quoted: number; unbilled: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'quoted')::int AS quoted,
              COUNT(*) FILTER (WHERE status = 'pod_received')::int AS unbilled
         FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL`,
      [C]
    ),
    query<{ arrivals: number; on_time: number }>(
      `SELECT COUNT(*)::int AS arrivals,
              COUNT(*) FILTER (WHERE s.appt_start IS NULL
                OR s.arrived_at <= s.appt_start + interval '30 minutes')::int AS on_time
         FROM hub.stops s
         JOIN hub.loads l ON l.id = s.load_id AND l.carrier_id = $1
         JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
        WHERE s.carrier_id = $1 AND s.type = 'delivery' AND s.arrived_at IS NOT NULL
          AND d.user_id = $2`,
      [C, userId]
    ),
    query<{ n: number; cents: string }>(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(i.amount_cents), 0)::bigint AS cents
         FROM hub.audit_log a
         JOIN hub.invoices i ON i.carrier_id = $1 AND i.id::text = a.entity_id
        WHERE a.carrier_id = $1 AND a.entity_type = 'invoice' AND a.action = 'create'
          AND a.actor_id = $2`,
      [C, userId]
    ),
    // Actor-scoped for the same reason ownerMetrics is: the sim's autopilot
    // records payments of its own (sandbox-sim.ts payInvoice, actor id null).
    // Counting every row on the carrier handed the accountant a completed
    // "a payment lands" objective for the autopilot's collections.
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM hub.audit_log
        WHERE carrier_id = $1 AND actor_id = $2
          AND entity_type = 'payment' AND action = 'record'`,
      [C, userId]
    ),
  ])

  const byStatus = new Map(moves.map((m) => [m.to_status ?? "", m.n]))
  const totalMoves = moves.reduce((s, m) => s + m.n, 0)
  const metrics: ShiftMetrics = {
    ...emptyMetrics(now.toISOString()),
    at: now.toISOString(),
    myBookings: byStatus.get("booked") ?? 0,
    myDispatches: byStatus.get("dispatched") ?? 0,
    quotedCount: boards[0]?.quoted ?? 0,
    myStatusMoves: totalMoves,
    myPodsSubmitted: byStatus.get("pod_received") ?? 0,
    myArrivals: arrivals[0]?.arrivals ?? 0,
    myOnTimeArrivals: arrivals[0]?.on_time ?? 0,
    myInvoices: invoices[0]?.n ?? 0,
    myInvoicedCents: Number(invoices[0]?.cents ?? 0),
    paymentsRecorded: payments[0]?.n ?? 0,
    unbilledCount: boards[0]?.unbilled ?? 0,
  }
  // The owner-operator drives like the company driver AND runs his own
  // books, so he needs both halves.
  if (seat === "owner_operator") {
    return { ...metrics, ...(await ownerOperatorMetrics(userId)) }
  }
  return metrics
}
